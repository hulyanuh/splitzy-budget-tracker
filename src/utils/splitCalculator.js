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

const getParticipantId = (row) => {
  if (!row) return null;
  return row.user_id || (row.guest_member_id ? `guest_${row.guest_member_id}` : null);
};

/**
 * Validate custom split — shares must sum to total
 */
export function validateCustomSplit(totalAmount, splits) {
  const sum = Object.values(splits).reduce((a, b) => a + parseFloat(b || 0), 0);
  return Math.abs(sum - totalAmount) < 0.01;
}

/**
 * Validate percentage split — percentages must sum to 100%
 */
export function validatePercentageSplit(splits) {
  const totalPercent = Object.values(splits).reduce((a, b) => a + parseFloat(b || 0), 0);
  return Math.abs(totalPercent - 100) < 0.5;
}

/**
 * Calculate percentage split — convert percentages to amounts
 * @param {number}   amount   - Total expense amount
 * @param {string[]} members  - Array of member IDs
 * @param {Object}   splits   - Map of memberId → percentage
 * @returns {Object} Map of memberId → share amount
 */
export function calculatePercentageSplit(amount, members, splits) {
  const result = {};
  const totalPercent = members.reduce((sum, id) => sum + (parseFloat(splits[id] || 0)), 0);
  let remainder = amount;

  for (let i = 0; i < members.length; i++) {
    const id = members[i];
    const percent = parseFloat(splits[id] || 0);
    const share = totalPercent > 0 ? (amount * percent) / totalPercent : 0;
    
    if (i === members.length - 1) {
      result[id] = remainder; // Assign remainder to last member to avoid rounding errors
    } else {
      const rounded = parseFloat(share.toFixed(2));
      result[id] = rounded;
      remainder -= rounded;
    }
  }

  return result;
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
    const payments = (expense.payments || []).reduce((acc, p) => {
      const id = getParticipantId(p);
      if (!id) return acc;
      acc[id] = (acc[id] || 0) + (parseFloat(p.amount) || 0);
      return acc;
    }, {});
    // Fallback: if no explicit payments rows, treat `paid_by` as a single payment covering the whole expense
    if ((!expense.payments || expense.payments.length === 0) && expense.paid_by) {
      const pid = expense.paid_by;
      payments[pid] = (payments[pid] || 0) + (parseFloat(expense.amount) || 0);
    }

    const splits = (expense.splits || []).reduce((acc, s) => {
      const id = getParticipantId(s);
      if (!id) return acc;
      acc[id] = parseFloat(s.amount) || 0;
      return acc;
    }, {});

    const splitPaid = (expense.splits || []).reduce((acc, s) => {
      const id = getParticipantId(s);
      if (!id) return acc;
      acc[id] = (acc[id] || 0) + (parseFloat(s.amount_paid) || 0);
      return acc;
    }, {});

    for (const id of memberIds) {
      if (!balances.hasOwnProperty(id)) continue;
      balances[id] += (payments[id] || 0) - (splits[id] || 0) + (splitPaid[id] || 0);
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
    let balanceAdjustment = 0;
    const memberId = member.id; // Direct use of id field

    for (const expense of expenses) {
      let expensePayments = (expense.payments || []).filter(p => getParticipantId(p) === memberId);
      // Fallback: if no payment rows, and this member is the `paid_by`, count full amount
      if ((expense.payments || []).length === 0 && expense.paid_by && expense.paid_by === memberId) {
        expensePayments = [{ user_id: expense.paid_by, amount: expense.amount }];
      }
      totalPaid += expensePayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      const split = (expense.splits || []).find(s => getParticipantId(s) === memberId);
      if (split) {
        const shareAmount = parseFloat(split.amount) || 0;
        totalShare += shareAmount;
        balanceAdjustment += parseFloat(split.amount_paid) || 0;
      }
    }

    const balance = totalPaid - totalShare + balanceAdjustment;
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
