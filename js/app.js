let currentStoryType = 'new';
let currentPage = 1;
let loading = false;
let lastUpdateTime = Date.now();
let lastKnownItemId = null;

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