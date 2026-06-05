const isProd = process.env.NODE_ENV === 'production';

function formatMsg(level, requestId, message, meta) {
  const ts = new Date().toISOString();
  const rid = requestId ? `[${requestId}] ` : '';
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level.toUpperCase()}] ${rid}${message}${metaStr}`;
}

const logger = {
  info:  (msg, meta, rid) => console.log(formatMsg('info', rid, msg, meta)),
  warn:  (msg, meta, rid) => console.warn(formatMsg('warn', rid, msg, meta)),
  error: (msg, meta, rid) => console.error(formatMsg('error', rid, msg, meta)),
  debug: (msg, meta, rid) => { if (!isProd) console.log(formatMsg('debug', rid, msg, meta)); },
};

module.exports = logger;
