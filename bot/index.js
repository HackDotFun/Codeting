// index.js

if (process.env.NODE_ENV === 'production') {
  setTimeout(() => {
    console.log('🔄 Scheduled restart, exiting process...');
    process.exit(0);
  }, 10 * 60 * 1000);
}

process.on('unhandledRejection', err => console.error('Unhandled Rejection:', err));
process.on('uncaughtException',  err => console.error('Uncaught Exception:', err));


require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { createClient } = require('@supabase/supabase-js');

// Global error handlers to prevent crash
process.on('unhandledRejection', err => console.error('Unhandled Rejection:', err));
process.on('uncaughtException', err => console.error('Uncaught Exception:', err));

// Initialize clients
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const connection = new Connection(process.env.SOLANA_RPC_URL, 'confirmed');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Constants and in-memory state
const REQUIRED_MINT = new PublicKey('9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump');
const pendingGenerate = new Set();   // awaiting wallet generation
const gameWallets = new Map();       // telegramId -> { publicKey, privateKey }
const userIds = new Map();           // telegramId -> DB user.id
const userWallets = new Map();       // telegramId -> holder wallet_address

// Load existing users and game wallets from DB
(async () => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, telegram_id, wallet_address, game_public_key, game_private_key');
    if (error) throw error;
    users.forEach(u => {
      if (u.game_public_key && u.game_private_key) {
        userIds.set(u.telegram_id, u.id);
        userWallets.set(u.telegram_id, u.wallet_address);
        gameWallets.set(u.telegram_id, {
          publicKey: u.game_public_key,
          privateKey: u.game_private_key
        });
      }
    });
    console.log(`Loaded ${gameWallets.size} game wallets from DB`);
  } catch (err) {
    console.error('Error initializing from DB:', err);
  }
})();

// /start command
bot.start(ctx => ctx.reply(
  'Welcome to Solana Russian Roulette! 🎲',
  Markup.inlineKeyboard([
    Markup.button.callback('🔑 Generate Wallet', 'generate'),
    Markup.button.callback('▶️ Play Game', 'play_game'),
    Markup.button.callback('🏆 View Ranking', 'view_ranking')
  ])
));

// Generate Wallet flow
bot.action('generate', askGenerate);
bot.command('generate', askGenerate);
async function askGenerate(ctx) {
  pendingGenerate.add(ctx.from.id);
  await ctx.answerCbQuery();
  return ctx.reply('🔗 Please send your Solana wallet address holding $GUN:');
}

// Handle wallet registration text
bot.on('text', async ctx => {
  const telegramId = ctx.from.id;
  if (!pendingGenerate.has(telegramId)) return;
  pendingGenerate.delete(telegramId);
  const text = ctx.message.text.trim();

  if (gameWallets.has(telegramId)) {
    const w = gameWallets.get(telegramId);
    return ctx.reply(`✅ Already registered!\n• Game PK: ${w.publicKey}\n• Game SK: ${w.privateKey}`);
  }

  let holderKey;
  try { holderKey = new PublicKey(text); }
  catch { return ctx.reply('❌ Invalid Solana address.'); }

  try {
    const { value: tokens } = await connection.getParsedTokenAccountsByOwner(holderKey, { mint: REQUIRED_MINT });
    const total = tokens.reduce((sum, acc) => sum + acc.account.data.parsed.info.tokenAmount.uiAmount, 0);
    if (total <= 0) return ctx.reply('❌ You must hold at least one $GUN token.');
  } catch (err) {
    console.error('Error verifying $GUN:', err);
    return ctx.reply('❌ Error verifying token. Try later.');
  }

  const newWallet = Keypair.generate();
  const publicKey = newWallet.publicKey.toBase58();
  const privateKey = Buffer.from(newWallet.secretKey).toString('hex');

  try {
    const { data: user, error: upsertError } = await supabase
      .from('users')
      .upsert({
        telegram_id: telegramId,
        wallet_address: text,
        game_public_key: publicKey,
        game_private_key: privateKey
      }, { onConflict: 'telegram_id' })
      .single();
    if (upsertError) throw upsertError;
    userIds.set(telegramId, user.id);
    userWallets.set(telegramId, text);
    gameWallets.set(telegramId, { publicKey, privateKey });

    return ctx.reply(`✅ Registration successful!\n🔑 Game wallet:\n• PK: ${publicKey}\n• SK: ${privateKey}`);
  } catch (err) {
    console.error('Error saving to database:', err);
    return ctx.reply('❌ Error saving to database.');
  }
});

// Play Game handler
bot.action('play_game', playGame);
async function playGame(ctx) {
  await ctx.answerCbQuery();
  const telegramId = ctx.from.id;
  try {
    let userId = userIds.get(telegramId);
    let holderAddress = userWallets.get(telegramId);
    if (!userId) {
      const { data: dbUser, error: fetchError } = await supabase
        .from('users')
        .select('id, wallet_address, game_public_key')
        .eq('telegram_id', telegramId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!dbUser) return ctx.reply('❌ Register first using 🔑 Generate Wallet.');
      userId = dbUser.id;
      holderAddress = dbUser.wallet_address;
      userIds.set(telegramId, userId);
      userWallets.set(telegramId, holderAddress);
      if (dbUser.game_public_key) {
        gameWallets.set(telegramId, {
          publicKey: dbUser.game_public_key,
          privateKey: dbUser.game_private_key
        });
      }
    }

    const tokensRes = await connection.getParsedTokenAccountsByOwner(new PublicKey(holderAddress), { mint: REQUIRED_MINT });
    if (!tokensRes.value.some(acc => acc.account.data.parsed.info.tokenAmount.uiAmount > 0))
      return ctx.reply('❌ Your wallet no longer holds $GUN.');

    const gameWallet = gameWallets.get(telegramId);
    if (!gameWallet) return ctx.reply('❌ No game wallet found.');

    const sessionId = await getOrCreateSession();
    await supabase.from('session_players').upsert({ session_id: sessionId, user_id: userId });

    const { data: players } = await supabase.from('session_players').select('user_id').eq('session_id', sessionId);
    const count = players.length;
    const lobbyMsg = `⏳ Lobby: ${count}/4 players`;
    players.forEach(async p => {
      const { data: u } = await supabase.from('users').select('telegram_id').eq('id', p.user_id).maybeSingle();
      if (u) bot.telegram.sendMessage(u.telegram_id, lobbyMsg);
    });
    if (count < 4) return;

    players.forEach(async p => {
      const { data: u } = await supabase.from('users').select('telegram_id').eq('id', p.user_id).maybeSingle();
      if (u) bot.telegram.sendMessage(u.telegram_id, '⏱️ Game starting in 3 seconds...');
    });
    await new Promise(r => setTimeout(r, 3000));

    const parts = [];
    for (const p of players) {
      const { data: u } = await supabase.from('users').select('game_public_key').eq('id', p.user_id).maybeSingle();
      if (u && u.game_public_key) parts.push(u.game_public_key);
    }
    const abbr = s => `${s.slice(0,3)}...${s.slice(-3)}`;
    const listed = parts.map(abbr).join(', ');

    const ids = players.map(p => p.user_id);
    const shoot = (a, b) => Math.random() < 1/6 ? b : a;
    const semi1 = shoot(ids[0], ids[1]);
    const semi2 = shoot(ids[2], ids[3]);
    const winner = Math.random() < 0.5 ? semi1 : semi2;

    await supabase.from('games').insert({ session_id: sessionId, winner_user_id: winner });
    const { count: wins } = await supabase.from('games').select('*', { count: 'exact' }).eq('winner_user_id', winner);

    const winPub = parts[ids.indexOf(winner)];
    const winAbbr = winPub ? abbr(winPub) : 'unknown';

    const summary = `Players: ${listed}\nWinner: ${winAbbr}\nTotal Wins: ${wins}`;
    players.forEach(async p => {
      const { data: u } = await supabase.from('users').select('telegram_id').eq('id', p.user_id).maybeSingle();
      if (u) bot.telegram.sendMessage(u.telegram_id, summary);
    });

    const { data: wUser } = await supabase.from('users').select('telegram_id').eq('id', winner).maybeSingle();
    if (wUser) bot.telegram.sendMessage(wUser.telegram_id, '🏆 Congratulations! You won this round!');
  } catch (err) {
    console.error('Error in playGame:', err);
    ctx.reply('❌ An error occurred playing the game. Please try again later.');
  }
}

// View Ranking
bot.action('view_ranking', async ctx => {
  await ctx.answerCbQuery();
  try {
    const { data: rows } = await supabase
      .from('leaderboard')
      .select('telegram_id,plays,wins')
      .order('win_rate', { ascending: false })
      .limit(5);
    let msg = '🏅 Top 5 Players:\n';
    rows.forEach((r, i) => msg += `${i+1}. @${r.telegram_id} – ${r.plays} games / ${r.wins} wins\n`);
    ctx.reply(msg);
  } catch (err) {
    console.error('Error fetching ranking:', err);
    ctx.reply('❌ Error fetching ranking.');
  }
});

// Helper: get or create session
async function getOrCreateSession() {
  try {
    const { data: sessions, error: fetchError } = await supabase
      .from('sessions')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1);
    if (fetchError) throw fetchError;

    if (!sessions || sessions.length === 0) {
      const insertRes = await supabase.from('sessions').insert({}).single();
      if (insertRes.error) throw insertRes.error;
      return insertRes.data.id;
    }

    const lastId = sessions[0].id;
    const { data: players } = await supabase
      .from('session_players')
      .select('user_id')
      .eq('session_id', lastId);
    if (players.length < 4) return lastId;

    const newRes = await supabase.from('sessions').insert({}).single();
    if (newRes.error) throw newRes.error;
    return newRes.data.id;
  } catch (err) {
    console.error('Error in getOrCreateSession:', err);
    // fallback to random session or exit
    return Date.now();
  }
}

// Launch bot
bot.launch().then(() => console.log('🤖 Bot started'));
