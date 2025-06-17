// Helper to get feed title for a given URL from loaded feeds
let loadedFeeds = []

// Save and load subscribed feeds from localStorage
function saveSubscribedFeeds() {
  localStorage.setItem('subscribedFeeds', JSON.stringify(loadedFeeds.map(f => f.url)));
}
function loadSubscribedFeeds() {
  try {
    return JSON.parse(localStorage.getItem('subscribedFeeds')) || [];
  } catch {
    return [];
  }
}

// Parse a feed from URL
async function fetchFeed(feedUrl) {
  if (window.rssAPI && window.rssAPI.fetchFeed) {
    const result = await window.rssAPI.fetchFeed(feedUrl);
    if (result && !result.error) return result;
    else throw new Error(result.error || 'Unknown error');
  } else {
    throw new Error('RSS API not available');
  }
}

// Load all the feeds by parsing the URLs from localStorage
async function loadAllFeeds() {
  const feedData = [];
  const toLoad = loadSubscribedFeeds();
  for (const feedUrl of toLoad) {
    try {
      const feed = await fetchFeed(feedUrl);
      feedData.push({
        title: feed.title,
        url: feedUrl,
        items: feed.items.slice(0, 10)
      });
    } catch (error) {
      console.error(`Failed to load ${feedUrl}:`, error);
    }
  }
  return feedData;
}

// render the feed directory with available feeds
function renderFeedList(feedData) {
  const feedList = document.getElementById('feed-list')
  feedList.innerHTML = feedData.map((feed, idx) => `
    <div class="feed-item" data-feed-idx="${idx}">
      <span>${feed.title}</span>
      <button class="unsubscribe-btn" data-feed-idx="${idx}">Unsubscribe</button>
    </div>
  `).join('')
  // Add click listeners for feed selection
  Array.from(feedList.getElementsByClassName('feed-item')).forEach(el => {
    el.addEventListener('click', function(e) {
      if (e.target.classList.contains('unsubscribe-btn')) return // Don't trigger select on unsubscribe
      Array.from(feedList.getElementsByClassName('feed-item')).forEach(e => e.classList.remove('selected'))
      el.classList.add('selected')
      renderArticles(feedData[el.dataset.feedIdx])
    })
  })
  // Unsubscribe from feeds
  Array.from(feedList.getElementsByClassName('unsubscribe-btn')).forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation()
      const idx = parseInt(btn.getAttribute('data-feed-idx'))
      loadedFeeds.splice(idx, 1)
      saveSubscribedFeeds();
      renderFeedList(loadedFeeds)
      // Also update feed directory to show unsubscribed feed
      if (window.feedDirectoryFeeds) renderFeedDirectory(window.feedDirectoryFeeds)
      // Clear article content if no feeds left
      if (loadedFeeds.length === 0) {
        document.getElementById('article-content').innerHTML = ''
      } else {
        // Show first feed if the removed one was selected
        document.querySelectorAll('.feed-item')[0].classList.add('selected')
        renderArticles(loadedFeeds[0])
      }
    })
  })
}
// display articles from the selected feed
function renderArticles(feed) {
  const articleContent = document.getElementById('article-content');
  articleContent.innerHTML = `
    <h2>${feed.title}</h2>
    ${feed.items.map(item => {
      let contentHtml = item.content || item['content:encoded'] || '';
      if (!contentHtml && item.contentSnippet) {
        contentHtml = `<p>${item.contentSnippet}</p>`;
      }
      return `
        <div class="article">
          <h3><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a></h3>
          <div class="article-body">${contentHtml}</div>
          <small>${item.pubDate ? new Date(item.pubDate).toLocaleString() : ''}</small>
        </div>
      `;
    }).join('')}
    <div id="img-modal">
      <span id="modal-close">&times;</span>
      <img id="modal-img" src=""/>
    </div>
  `;
  // Ensure all links in article-body open in a new window
  setTimeout(() => {
    document.querySelectorAll('.article-body a').forEach(a => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
    // image modal for viewing images
    const modal = document.getElementById('img-modal');
    const modalImg = document.getElementById('modal-img');
    const modalClose = document.getElementById('modal-close');
    document.querySelectorAll('.article-body img').forEach(img => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', e => {
        e.stopPropagation();
        modal.style.display = 'flex';
        modalImg.src = img.src;
      });
    });
    modalClose.addEventListener('click', e => {
      modal.style.display = 'none';
      modalImg.src = '';
    });
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.style.display = 'none';
        modalImg.src = '';
      }
    });
  }, 0);
}

// Feed subscription UI and logic
function renderFeedSubscription() {
  const sidebar = document.getElementById('sidebar')
  let form = document.getElementById('feed-subscribe-form')
  if (!form) {
    form = document.createElement('form')
    form.id = 'feed-subscribe-form'
    form.innerHTML = `
      <input id="feed-url-input" type="url" placeholder="Add feed URL..." required />
      <button class="add-btn" type="submit">Add</button>
    `
    sidebar.insertBefore(form, sidebar.children[1])
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const input = document.getElementById('feed-url-input')
      const url = input.value.trim()
      if (!url) return
      input.disabled = true
      try {
        const feed = await fetchFeed(url)
        if (feed && feed.title) {
          loadedFeeds.push({
            title: feed.title,
            url: url,
            items: feed.items.slice(0, 10)
          })
          renderFeedList(loadedFeeds)
          saveSubscribedFeeds();
        } else {
          alert('Could not load feed. Please check the URL.')
        }
      } catch (err) {
        alert('Could not load feed. Please check the URL.')
      }
      input.value = ''
      input.disabled = false
    })
  }
}

// Parse rssfeeds.txt and provide a UI for browsing and subscribing
async function loadFeedDirectory() {
  const res = await fetch('rssfeeds.txt')
  const text = await res.text()
  const lines = text.split(/\r?\n/).filter(l => l && !l.startsWith('RSS URLs') && !l.startsWith('country'))
  const feeds = lines.map(line => {
    const [country, category, ...urlParts] = line.trim().split(' ')
    return {
      country,
      category,
      url: urlParts.join(' ')
    }
  })
  return feeds
}
// Display feed directory with filtering options
function renderFeedDirectory(feeds) {
  const sidebar = document.getElementById('sidebar')
  let dirDiv = document.getElementById('feed-directory')
  if (!dirDiv) {
    dirDiv = document.createElement('div')
    dirDiv.id = 'feed-directory'
    sidebar.appendChild(dirDiv)
  }
  // Filter UI
  dirDiv.innerHTML = `
    <div>
      <label id=country-label>Filter by country:</label>
      <select id="dir-country-filter"><option value="">All</option>${[...new Set(feeds.map(f=>f.country))].map(c=>`<option value="${c}">${c}</option>`).join('')}</select>
      <label>Category:</label>
      <select id="dir-category-filter"><option value="">All</option>${[...new Set(feeds.map(f=>f.category))].map(c=>`<option value="${c}">${c}</option>`).join('')}</select>
    </div>
    <div id="dir-feed-list"></div>
  `
  // Update feed list based on filters
  function updateList() {
    const country = document.getElementById('dir-country-filter').value
    const category = document.getElementById('dir-category-filter').value
    let filtered = feeds
    if (country) filtered = filtered.filter(f => f.country === country)
    if (category) filtered = filtered.filter(f => f.category === category)
    // Hide already subscribed feeds
    const subscribedUrls = new Set(loadedFeeds.map(f => f.url))
    filtered = filtered.filter(f => !subscribedUrls.has(f.url))
    document.getElementById('dir-feed-list').innerHTML = filtered.map(f => `
      <div class="feed-item">
        <span>${f.country} | ${f.category}</span><br>
        <span style="font-size:0.95em;word-break:break-all;">${f.url}</span>
        <button class="subscribe-btn" data-url="${f.url}">Subscribe</button>
      </div>
    `).join('')
    // Subscribe button logic
    Array.from(document.querySelectorAll('#dir-feed-list button')).forEach(btn => {
      btn.onclick = async function() {
        const url = btn.getAttribute('data-url')
        const feed = await fetchFeed(url)
        if (feed && feed.title) {
          loadedFeeds.push({
            title: feed.title,
            url: url,
            items: feed.items.slice(0, 10)
          })
          renderFeedList(loadedFeeds)
          saveSubscribedFeeds();
          updateList() // Hide just-subscribed feed
        } else {
          alert('Could not load feed. Please check the URL.')
        }
      }
    })
  }
  document.getElementById('dir-country-filter').onchange = updateList
  document.getElementById('dir-category-filter').onchange = updateList
  updateList()
}

// Initial load
loadAllFeeds().then(feedData => {
  loadedFeeds = feedData
  renderFeedSubscription()
  renderFeedList(feedData)
  loadFeedDirectory().then(renderFeedDirectory)
  // Select the first feed by default
  if (feedData.length > 0) {
    document.querySelectorAll('.feed-item')[0].classList.add('selected')
    renderArticles(feedData[0])
  }
}).catch(error => {
  console.error('Error loading feeds:', error)
})