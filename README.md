# Postpulse
Postpulse is a tech news aggregator that provides users with the latest and most popular stories from HackerNews. It features a clean and responsive design with dynamic content loading and real-time updates.

## Project Structure

- **index.html**: Basic structure and layout for Postpulse, including navigation and dynamic content areas.
- **styles.css**: Responsive and minimal design focusing on readability and mobile support.
- **api.js**: API interaction logic with caching and retry mechanism for fetching posts and comments from HackerNews API.
- **ui.js**: Functions for dynamic rendering of posts and comments, including handling stories, jobs, and polls.
- **app.js**: Integration of post loading, pagination, and real-time updates for a seamless user experience.
- **utils.js**: Utility functions for throttling, debouncing, and formatting dates to ensure consistent API requests and UI updates.

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Stella-Achar-Oiro/postpulse.git
   cd clonernews
   ```

2. **Open `index.html` in your browser** to start using Postpulse.

## File Descriptions

### `index.html`
Sets up the basic structure of the application, including the header, navigation, main content area, and buttons. It links to external CSS and JavaScript files for styling and functionality.

### `styles.css`
Implements the visual design of Postpulse, ensuring it is responsive and looks good on both desktop and mobile devices. Includes styles for the layout, posts, comments, and notifications.

### `api.js`
Handles interactions with the HackerNews API. Includes functions for fetching stories, items, and updates with a retry mechanism to handle potential errors and caching to improve performance.

### `ui.js`
Contains functions for dynamically rendering posts and comments based on the data fetched from the API. Manages how posts are displayed and how comments are loaded and toggled.

### `app.js`
Manages the core application logic, including loading posts, handling pagination, and checking for real-time updates. Integrates various UI elements and ensures a smooth user experience.

### `utils.js`
Provides utility functions for throttling and debouncing to manage API request rates, and for formatting dates to present them in a human-readable format.

## Features

- Dynamic loading of tech news stories from HackerNews.
- Real-time updates with notifications for new posts.
- Responsive design for optimal viewing on all devices.
- Caching and retry logic for improved API performance.

## Contribution

Feel free to submit pull requests or open issues if you have any suggestions or find bugs. Your contributions are welcome!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
