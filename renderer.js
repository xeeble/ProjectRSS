const Parser = require('rss-parser')
const parser = new Parser()

async function loadFeed(url) {
  try {
    const feed = await parser.parseURL(url)
    displayArticles(feed.items)
  } catch (error) {
    console.error('Error loading feed:', error)
  }
}

function displayArticles(articles) {
  const container = document.getElementById('feed-list')
  container.innerHTML = articles.map(article => `
    <div class="article">
      <h3>${article.title}</h3>
      <p>${article.contentSnippet}</p>
    </div>
  `).join('')
}