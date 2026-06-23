import db from '../server/db.js';

async function test() {
  try {
    const userResult = await db.query('SELECT * FROM users LIMIT 1');
    const user = userResult.rows[0];
    if (!user) {
      console.log('No user found');
      return;
    }
    console.log('User accountSize:', user.account_size || user.accountSize);

    const accountsResult = await db.query('SELECT * FROM accounts WHERE user_id = $1', [user.id]);
    const accounts = accountsResult.rows.map(acc => ({
      id: acc.id,
      accountName: acc.account_name,
      startingBalance: acc.balance,
    }));
    console.log('Accounts:', accounts);

    const tradesResult = await db.query('SELECT * FROM trades WHERE user_id = $1 ORDER BY entry_time ASC', [user.id]);
    const trades = tradesResult.rows.map(t => ({
      id: t.id,
      pnl: parseFloat(t.pnl) || 0,
      entryTime: t.entry_time,
      accountId: t.account_id,
    }));
    console.log('Trades count:', trades.length);

    // Calculate startBalance
    const accountsLength = accounts.length;
    const startBalance = accountsLength > 0 ? accounts.reduce((acc, curr) => acc + (parseFloat(curr.startingBalance) || 0), 0) : 25000;
    console.log('startBalance:', startBalance);

    let running = 0;
    const data = [{
      date: 'Start',
      equity: startBalance,
      pnl: 0,
      symbol: 'Start'
    }];

    trades.forEach((t, idx) => {
      running += t.pnl || 0;
      data.push({
        index: idx + 1,
        date: t.entryTime,
        equity: parseFloat((startBalance + running).toFixed(2)),
        pnl: t.pnl,
      });
    });

    console.log('Equity Curve Data Sample:', data);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
