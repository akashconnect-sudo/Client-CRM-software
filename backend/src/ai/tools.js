/**
 * Tenant-scoped LangChain tools for the AI Advisor agent.
 * Every query MUST filter by companyId.
 */
import prisma from '../config/db.js';

export function createAdvisorTools(companyId) {
  if (!companyId) throw new Error('companyId required for AI tools');

  return {
    async queryLeads({ status, hotOnly, limit = 20, search } = {}) {
      const where = { companyId };
      if (status) where.status = String(status).toUpperCase();
      if (search) {
        where.OR = [
          { customerName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
      const leads = await prisma.lead.findMany({
        where,
        take: Math.min(Number(limit) || 20, 50),
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          leadNumber: true,
          customerName: true,
          phone: true,
          status: true,
          source: true,
          followUpDate: true,
          pulseReasoning: true,
          assignedTo: { select: { name: true } },
          createdAt: true,
        },
      });
      let rows = leads;
      if (hotOnly) {
        rows = rows.filter((l) =>
          ['INTERESTED', 'FOLLOW_UP', 'NEW', 'CONTACTED'].includes(l.status)
        );
      }
      return {
        count: rows.length,
        leads: rows.map((l) => ({
          sno: l.leadNumber,
          name: l.customerName,
          status: l.status,
          source: l.source,
          assignee: l.assignedTo?.name || null,
          followUp: l.followUpDate,
          pulse: l.pulseReasoning,
        })),
      };
    },

    async getFollowUps({ type = 'pending', limit = 20 } = {}) {
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);

      const where = {
        isCompleted: false,
        lead: { companyId },
      };
      if (type === 'today') {
        where.scheduledAt = { gte: start, lte: end };
      } else if (type === 'missed') {
        where.scheduledAt = { lt: start };
      }

      const rows = await prisma.followUp.findMany({
        where,
        take: Math.min(Number(limit) || 20, 50),
        orderBy: { scheduledAt: 'asc' },
        include: {
          lead: { select: { leadNumber: true, customerName: true, status: true, phone: true } },
          employee: { select: { name: true } },
        },
      });
      return {
        count: rows.length,
        followUps: rows.map((f) => ({
          when: f.scheduledAt,
          lead: f.lead?.customerName,
          sno: f.lead?.leadNumber,
          status: f.lead?.status,
          owner: f.employee?.name,
          remarks: f.remarks,
        })),
      };
    },

    async getReportSummary() {
      const [totalLeads, converted, newLeads, answered, missed, pendingFu] = await Promise.all([
        prisma.lead.count({ where: { companyId } }),
        prisma.lead.count({ where: { companyId, status: 'CONVERTED' } }),
        prisma.lead.count({
          where: {
            companyId,
            createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
          },
        }),
        prisma.callLog.count({ where: { companyId, callStatus: 'ANSWERED' } }),
        prisma.callLog.count({ where: { companyId, callStatus: 'MISSED' } }),
        prisma.followUp.count({
          where: { isCompleted: false, lead: { companyId } },
        }),
      ]);
      const conversionRate =
        totalLeads > 0 ? Number(((converted / totalLeads) * 100).toFixed(1)) : 0;
      return {
        totalLeads,
        converted,
        conversionRate,
        newLeads7d: newLeads,
        callsAnswered: answered,
        callsMissed: missed,
        pendingFollowUps: pendingFu,
      };
    },
  };
}

/** Simple tool-calling loop without requiring LangChain agents package. */
export async function runAdvisorWithTools({ companyId, question, history = [], chatFn }) {
  const tools = createAdvisorTools(companyId);
  const lower = String(question || '').toLowerCase();
  const toolsUsed = [];
  const contextBits = [];

  if (/hot lead|how many lead|lead count|pipeline|new lead/.test(lower)) {
    toolsUsed.push('queryLeads');
    contextBits.push(
      JSON.stringify(
        await tools.queryLeads({
          hotOnly: /hot/.test(lower),
          status: /converted/.test(lower) ? 'CONVERTED' : undefined,
          limit: 25,
        })
      )
    );
  }
  if (/follow.?up|missed|today/.test(lower)) {
    toolsUsed.push('getFollowUps');
    const type = /missed/.test(lower) ? 'missed' : /today/.test(lower) ? 'today' : 'pending';
    contextBits.push(JSON.stringify(await tools.getFollowUps({ type })));
  }
  if (/report|conversion|performance|summary|intake/.test(lower) || toolsUsed.length === 0) {
    toolsUsed.push('getReportSummary');
    contextBits.push(JSON.stringify(await tools.getReportSummary()));
  }

  const system = `You are the CRM AI Advisor for one workspace only. Use ONLY the provided JSON context. Never invent IDs or counts. Be concise and actionable. If data is empty, say so.`;
  const messages = [
    { role: 'system', content: system },
    ...history.slice(-6).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || ''),
    })),
    {
      role: 'user',
      content: `Question: ${question}\n\nCRM context (tenant-scoped):\n${contextBits.join('\n')}`,
    },
  ];

  const reply = await chatFn(messages);
  return { reply, toolsUsed };
}
