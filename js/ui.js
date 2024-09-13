const createPostElement = (post) => {
    const postEl = document.createElement('article');
    postEl.className = 'post';
    postEl.dataset.id = post.id;

    let content = '';
    switch (post.type) {
        case 'story':
            content = `
                <h2><a href="${post.url}" target="_blank">${post.title}</a></h2>
                <div class="post-meta">
                    <span>${post.score} points</span> | 
                    <span>by ${post.by}</span> | 
                    <span>${formatDate(post.time)}</span>
                    <span class="load-comments" data-post-id="${post.id}">| ${post.descendants || 0} comments</span>
                </div>
            `;
            break;
        case 'job':
            content = `
                <h2><a href="${post.url}" target="_blank">${post.title}</a></h2>
                <div class="post-meta">
                    <span>by ${post.by}</span> | 
                    <span>${formatDate(post.time)}</span>
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
                </div>
                <ul class="poll-options">
                    ${post.parts ? post.parts.map(part => `<li>${part.text} (${part.score} votes)</li>`).join('') : ''}
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

    return postEl;
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