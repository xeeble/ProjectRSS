const fs = require('fs');
const Parser = require('rss-parser');
const parser = new Parser();

async function checkFeeds(filePath) {
  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
  const headerLines = lines.slice(0, 2);
  const feedLines = lines.slice(2);
  const validFeeds = [];

  for (const line of feedLines) {
    if (!line.trim()) continue;
    const parts = line.split(' ');
    const url = parts.slice(2).join(' ');
    try {
      await parser.parseURL(url);
      validFeeds.push(line);
      console.log('OK:', url);
    } catch (e) {
      console.log('FAIL:', url);
    }
  }

  fs.writeFileSync(filePath, [...headerLines, ...validFeeds].join('\n'), 'utf-8');
  console.log('Done. Only valid feeds remain in', filePath);
}

checkFeeds('rssfeeds.txt');