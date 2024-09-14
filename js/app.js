// Constants and global variables
const API_BASE_URL = 'https://hacker-news.firebaseio.com/v0/';
const ITEMS_PER_PAGE = 20;
const COMMENT_FETCH_LIMIT = 5;
const THROTTLE_DELAY = 1000;
const DEBOUNCE_DELAY = 300;

let currentStoryType = 'new';
let currentPage = 1;
let loading = false;
let lastUpdateTime = Date.now();
let lastKnownItemId = null;
let itemCache = new Map();

// Utility functions
const throttle = (func, delay) => {
    let lastCall = 0;
    return (...args) => {
        const now = Date.now();
        if (now - lastCall < delay) return;
        lastCall = now;
        return func(...args);
    };
};

const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
};

// API functions
const fetchWithRetry = async (url, retries = 3) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchWithRetry(url, retries - 1);
        }
        throw error;
    }
};

const fetchItem = async (id) => {
    if (itemCache.has(id)) {
        return itemCache.get(id);
    }
    const item = await fetchWithRetry(`${API_BASE_URL}item/${id}.json`);
    itemCache.set(id, item);
    return item;
};

const fetchStories = async (storyType, page = 1) => {
    const cachedStories = itemCache.get(`${storyType}_${page}`);
    if (cachedStories) {
        return cachedStories;
    }
    let endpoint;
    switch (storyType) {
        case 'poll':
            endpoint = 'topstories'; // Polls are included in top stories
            break;
        case 'job':
            endpoint = 'jobstories';
            break;
        default:
            endpoint = `${storyType}stories`;
    }
    const allStories = await fetchWithRetry(`${API_BASE_URL}${endpoint}.json`);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageStories = allStories.slice(startIndex, endIndex);
    itemCache.set(`${storyType}_${page}`, pageStories);
    return pageStories;
};

const fetchUpdates = throttle(async () => {
    return fetchWithRetry(`${API_BASE_URL}updates.json`);
}, THROTTLE_DELAY);

// UI functions
const createPostElement = (post) => {
    const postEl = document.createElement('article');
    postEl.className = 'post';
    postEl.dataset.id = post.id;

    let content = '';
    switch (post.type) {
        case 'story':
        case 'job':
            content = `
                <h2><a href="${post.url}" target="_blank">${post.title}</a></h2>
                <div class="post-meta">
                    ${post.score ? `<span>${post.score} points</span> | ` : ''}
                    <span>by ${post.by}</span> | 
                    <span>${formatDate(post.time)}</span>
                    ${post.descendants !== undefined ? `<span class="load-comments" data-post-id="${post.id}">| ${post.descendants} comments</span>` : ''}
                </div>
            `;
            break;
        case 'poll':
            content = `
                <h2>${post.title}</h2>
                <div class="post-meta">
                    <span>${post.score} points</span> | 
                    <span>by ${post.by}</span> | 
                    <span>${formatDate(post.time)}</span>
                    ${post.descendants ? `<span class="load-comments" data-post-id="${post.id}">| ${post.descendants} comments</span>` : ''}
                </div>
                <ul class="poll-options">
                    ${post.parts ? `<li>Loading poll options...</li>` : ''}
                </ul>
            `;
            break;
    }

    content += `<div class="comments" id="comments-${post.id}"></div>`;
    postEl.innerHTML = content;

    const loadCommentsSpan = postEl.querySelector('.load-comments');
    if (loadCommentsSpan) {
        loadCommentsSpan.addEventListener('click', () => loadComments(post.id));
    }

    if (post.type === 'poll' && post.parts) {
        loadPollOptions(post.id, post.parts, postEl.querySelector('.poll-options'));
    }

    return postEl;
};

const loadPollOptions = async (pollId, partIds, container) => {
    try {
        const pollParts = await Promise.all(partIds.map(fetchItem));
        container.innerHTML = '';
        pollParts.forEach(part => {
            const optionEl = document.createElement('li');
            optionEl.innerHTML = `${part.text} <span class="poll-score">(${part.score} votes)</span>`;
            container.appendChild(optionEl);
        });
    } catch (error) {
        console.error('Error loading poll options:', error);
        container.innerHTML = '<li>Failed to load poll options. Please try again later.</li>';
    }
};

const createCommentElement = (comment, depth = 0) => {
    const commentEl = document.createElement('div');
    commentEl.className = 'comment';
    commentEl.style.marginLeft = `${depth * 20}px`;
    commentEl.innerHTML = `
        <p><strong>${comment.by}</strong>: ${comment.text}</p>
        <div class="comment-meta">
            <span>${formatDate(comment.time)}</span>
            ${comment.kids ? `| <a href="#" class="toggle-replies-link" data-comment-id="${comment.id}" data-reply-count="${comment.kids.length}">load replies (${comment.kids.length})</a>` : ''}
        </div>
        <div class="replies" id="replies-${comment.id}"></div>
    `;
    return commentEl;
};

const displayComments = (comments, container, depth = 0) => {
    comments.forEach(comment => {
        if (comment.deleted || comment.dead) return;
        
        const commentEl = createCommentElement(comment, depth);
        container.appendChild(commentEl);

        if (comment.kids && comment.kids.length > 0) {
            const repliesContainer = commentEl.querySelector('.replies');
            const toggleRepliesLink = commentEl.querySelector('.toggle-replies-link');
            
            toggleRepliesLink.addEventListener('click', async (e) => {
                e.preventDefault();
                if (repliesContainer.dataset.loaded !== 'true') {
                    toggleRepliesLink.textContent = 'Loading...';
                    const replies = await Promise.all(comment.kids.map(fetchItem));
                    displayComments(replies, repliesContainer, depth + 1);
                    repliesContainer.dataset.loaded = 'true';
                    toggleRepliesLink.textContent = 'hide replies';
                } else {
                    repliesContainer.style.display = repliesContainer.style.display === 'none' ? 'block' : 'none';
                    toggleRepliesLink.textContent = repliesContainer.style.display === 'none' ? 
                        `load replies (${comment.kids.length})` : 'hide replies';
                }
            });
        }
    });
};

const showNotification = (message) => {
    const notificationEl = document.getElementById('notifications');
    notificationEl.textContent = message;
    notificationEl.style.display = 'block';
    setTimeout(() => {
        notificationEl.style.display = 'none';
    }, 5000);
};

// Main functions
const loadPosts = debounce(async (page = currentPage) => {
    if (loading) return;
    loading = true;
    try {
        const storyIds = await fetchStories(currentStoryType, page);
        const posts = await Promise.all(storyIds.map(fetchItem));
        const filteredPosts = currentStoryType === 'poll' 
            ? posts.filter(post => post.type === 'poll')
            : posts;
        filteredPosts.sort((a, b) => b.time - a.time);
        
        const contentEl = document.getElementById('content');
        if (page === 1) contentEl.innerHTML = '';
        filteredPosts.forEach(post => contentEl.appendChild(createPostElement(post)));
        
        currentPage = page;
        if (page === 1 && filteredPosts.length > 0) {
            lastKnownItemId = filteredPosts[0].id;
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        showNotification('Failed to load posts. Please try again later.');
    } finally {
        loading = false;
    }
}, DEBOUNCE_DELAY);

const loadMorePosts = () => {
    loadPosts(currentPage + 1);
};

const loadComments = async (postId) => {
    console.log(`Loading comments for post ${postId}`);
    const commentsContainer = document.getElementById(`comments-${postId}`);
    const loadCommentsLink = document.querySelector(`.load-comments[data-post-id="${postId}"]`);
    
    if (commentsContainer.dataset.loaded === 'true') {
        console.log('Comments already loaded, toggling visibility');
        const isHidden = commentsContainer.style.display === 'none';
        commentsContainer.style.display = isHidden ? 'block' : 'none';
        loadCommentsLink.textContent = isHidden ? 'hide comments' : `${loadCommentsLink.dataset.commentCount} comments`;
        return;
    }

    try {
        commentsContainer.innerHTML = '<p>Loading comments...</p>';
        const post = await fetchItem(postId);
        console.log('Fetched post:', post);
        if (post.kids && post.kids.length > 0) {
            commentsContainer.innerHTML = ''; // Clear loading message
            const topLevelComments = await Promise.all(post.kids.slice(0, COMMENT_FETCH_LIMIT).map(fetchItem));
            console.log('Fetched top-level comments:', topLevelComments);
            displayComments(topLevelComments, commentsContainer);
            commentsContainer.dataset.loaded = 'true';
            loadCommentsLink.textContent = 'hide comments';
            loadCommentsLink.dataset.commentCount = post.kids.length; // Store the comment count
            console.log('Comments displayed');
        } else {
            commentsContainer.innerHTML = '<p>No comments yet.</p>';
            console.log('No comments for this post');
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        commentsContainer.innerHTML = '<p>Failed to load comments. Please try again later.</p>';
    }
};

const checkForUpdates = throttle(async () => {
    const now = Date.now();
    if (now - lastUpdateTime < 5000) return;

    try {
        const updates = await fetchUpdates();
        const newItems = updates.items.filter(id => id > lastKnownItemId);
        
        if (newItems.length > 0) {
            showNotification(`${newItems.length} new items available. Refresh to see the latest.`);
            lastKnownItemId = Math.max(...newItems);
        }
        
        lastUpdateTime = now;
    } catch (error) {
        console.error('Error checking for updates:', error);
    }
}, THROTTLE_DELAY);

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('load-more').addEventListener('click', loadMorePosts);

    document.querySelectorAll('nav a, .dropdown-content a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            currentStoryType = e.target.dataset.storyType;
            currentPage = 1;
            loadPosts(1);
        });
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('load-comments')) {
            e.preventDefault();
            const postId = e.target.dataset.postId;
            loadComments(postId);
        } else if (e.target.classList.contains('reply-link')) {
            e.preventDefault();
            const parentId = e.target.dataset.parentId;
            // Implement reply functionality here
            console.log(`Reply to comment ${parentId}`);
        }
    });

    // Initialization
    loadPosts(1);
    setInterval(checkForUpdates, 5000);
});