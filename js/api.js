const API_BASE_URL = 'https://hacker-news.firebaseio.com/v0/';
const ITEMS_PER_PAGE = 20;
const COMMENT_FETCH_LIMIT = 5; // Limit initial comment fetch

let itemCache = new Map();

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
    const allStories = await fetchWithRetry(`${API_BASE_URL}${storyType}stories.json`);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageStories = allStories.slice(startIndex, endIndex);
    itemCache.set(`${storyType}_${page}`, pageStories);
    return pageStories;
};

const fetchUpdates = throttle(async () => {
    return fetchWithRetry(`${API_BASE_URL}updates.json`);
}, THROTTLE_DELAY);