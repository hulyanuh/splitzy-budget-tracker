// ═══════════════════════════════════════════════════════════════════════════
// 💰 SPLIT CALCULATOR UTILITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate equal split for all members
 * @param {number}   amount  - Total expense amount
 * @param {string[]} members - Array of member IDs
 * @returns {Object} Map of memberId → share amount
 */
export function calculateEqualSplit(amount, members) {
  const perPerson = parseFloat((amount / members.length).toFixed(2));
  const remainder = parseFloat((amount - perPerson * (members.length - 1)).toFixed(2));

  return members.reduce((acc, id, idx) => {
    acc[id] = idx === members.length - 1 ? remainder : perPerson;
    return acc;
  }, {});
}

/**
 * Validate custom split — shares must sum to total
 */
export function validateCustomSplit(totalAmount, splits) {
  const sum = Object.values(splits).reduce((a, b) => a + parseFloat(b || 0), 0);
  return Math.abs(sum - totalAmount) < 0.01;
}

/**
 * Calculate net balances for a group
 * @param {Object[]} expenses - List of expense objects with splits
 * @param {string[]} memberIds
 * @returns {Object} Map of memberId → net balance (positive = owed to them, negative = they owe)
 */
export function calculateGroupBalances(expenses, memberIds) {
  const balances = memberIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {});

  for (const expense of expenses) {
    const payerId = expense.paid_by;
    if (!balances.hasOwnProperty(payerId)) continue;

    // Only debit/credit active (unsettled) splits
    for (const split of (expense.splits || [])) {
      if (split.is_settled) continue;
      
      // Don't count payer's own split as a debt to themselves
      if (split.user_id === payerId) continue;

      if (balances.hasOwnProperty(split.user_id)) {
        balances[split.user_id] -= split.amount;
        balances[payerId] += split.amount;
      }
    }
  }

  return balances;
}

/**
 * Calculate simplified debt settlement (minimize transactions)
 * @param {Object} balances - Map of memberId → net balance
 * @returns {Object[]} Array of { from, to, amount } transactions
 */
export function simplifyDebts(balances) {
  const creditors = [];
  const debtors   = [];

  for (const [id, bal] of Object.entries(balances)) {
    if (bal > 0.005)  creditors.push({ id, amount:  bal });
    if (bal < -0.005) debtors.push({ id, amount: -bal });
  }

  const transactions = [];

  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amount = Math.min(c.amount, d.amount);

    transactions.push({
      from:   d.id,
      to:     c.id,
      amount: parseFloat(amount.toFixed(2)),
    });

    c.amount -= amount;
    d.amount -= amount;
    if (c.amount < 0.005) ci++;
    if (d.amount < 0.005) di++;
  }

  return transactions;
}

/**
 * Format currency amount
 */
const CURRENCY_SYMBOLS = {
  PHP: '₱',
  USD: '$',
  EUR: '€',
  SGD: 'S$',
  JPY: '¥',
};

export function formatCurrency(amount, currencyCode = 'PHP') {
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode || '₱';
  const val = parseFloat(amount || 0);
  const formatted = Math.abs(val).toFixed(2);
  return val < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

/**
 * Get balance label and color
 */
export function getBalanceInfo(amount) {
  if (Math.abs(amount) < 0.01) {
    return { label: 'Settled', color: '#8b6aad', icon: '✓' };
  }
  if (amount > 0) {
    return { label: `Gets back`, color: '#22c55e', icon: '↑' };
  }
  return { label: `Owes`, color: '#ef4444', icon: '↓' };
}

/**
 * Calculate per-member summary for a group
 */
export function calculateMemberSummary(expenses, members) {
  return members.map(member => {
    let totalPaid = 0;
    let totalShare = 0;
    let activePaid = 0;
    let activeShare = 0;
    const memberId = member.id || member.user_id;

    for (const expense of expenses) {
      if (expense.paid_by === memberId) {
        totalPaid += expense.amount;
        // Receivables: outstanding splits from other people
        const otherSplitsUnsettled = (expense.splits || []).filter(s => s.user_id !== expense.paid_by && !s.is_settled);
        activePaid += otherSplitsUnsettled.reduce((sum, s) => sum + s.amount, 0);
      }
      const split = (expense.splits || []).find(s => s.user_id === memberId);
      if (split) {
        totalShare += split.amount;
        // Payables: our split if not settled and we are not the payer
        if (!split.is_settled && expense.paid_by !== memberId) {
          activeShare += split.amount;
        }
      }
    }

    const balance = activePaid - activeShare;
    return {
      ...member,
      id: memberId,
      totalPaid:  parseFloat(totalPaid.toFixed(2)),
      totalShare: parseFloat(totalShare.toFixed(2)),
      balance:    parseFloat(balance.toFixed(2)),
      ...getBalanceInfo(balance),
    };
  });
}
