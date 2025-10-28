# Media Manager: Organize and Access Your Digital Assets

A robust TypeScript application for managing your photos, videos, and other digital media files. Streamline organization, search, and access to all your precious memories and content.

## About

Media Manager is a TypeScript-based application designed to simplify the process of organizing, searching, and accessing your digital media files. Tired of scattered folders and endless scrolling? Media Manager provides a centralized hub for all your photos, videos, audio files, and more.  It's built with a focus on performance, extensibility, and ease of use, making it ideal for both casual users and power users alike.  This project aims to provide a solid foundation that can be expanded upon with additional features and integrations in the future.

## Key Features 🚀

*   **Centralized Media Library:**  Consolidate all your media files into a single, easily navigable location.
*   **Smart Tagging & Metadata:**  Add custom tags and utilize existing metadata to categorize your files effectively.
*   **Powerful Search Functionality:** Quickly locate specific media items using keywords, tags, or metadata.
*   **Folder Organization:** Create and manage folders to further structure your media collection.
*   **Preview Generation:** Automatically generate thumbnails and previews for quick visual identification.
*   **Cross-Platform Compatibility (Future):** Designed with a modular architecture to facilitate future cross-platform support.

## Getting Started 🛠️

**Prerequisites:**

*   Node.js (version 16 or higher)
*   npm (or yarn/pnpm - this guide uses npm)

**Installation:**

1.  Clone the repository:
    ```bash
    git clone https://github.com/pkibbey/media-manager.git
    cd media-manager
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Build the project (for development):
    ```bash
    npm run build:dev
    ```

4.  Run the application (for development):
    ```bash
    npm run start:dev
    ```

   This will typically launch the application in your browser at `http://localhost:3000` (or a similar address).

## Usage 💻

Let's say you want to add a new photo and tag it with "Vacation" and "Beach".

1.  **Add a Photo:** Navigate to the "Import Media" section of the application and select your desired photo file.
2.  **Tagging:** After importing, locate the newly added photo in your media library. Click on the photo to view its details.  In the "Tags" section, type "Vacation" and press Enter. Then, type "Beach" and press Enter again.
3.  **Searching:** To find all photos tagged with "Vacation" and "Beach", go to the search bar, type `tag:Vacation AND tag:Beach`, and press Enter. The application will display all matching media items.

**Example with Metadata:**

If your photo already has metadata (e.g., camera model, date taken), Media Manager will automatically extract and display this information. You can then use this metadata in your searches as well (e.g., `camera:Canon`).

## Contributing 🤝

We welcome contributions to Media Manager!  Here's how you can get involved:

1.  **Fork the Repository:** Create a fork of this repository on GitHub.
2.  **Create a Branch:** Create a new branch for your feature or bug fix (e.g., `feature/new-tagging-ui`).
3.  **Make Changes:** Implement your changes, ensuring that the code adheres to our coding style (see `tsconfig.json` and `.eslintrc.js`).
4.  **Submit a Pull Request:** Create a pull request to the `main` branch, providing a clear description of your changes.
5.  **Code Style:** Please ensure that all code is properly formatted and linted before submitting a pull request. We use ESLint with TypeScript for linting.

We appreciate all contributions, big or small!  Please review our [Contributing Guidelines](CONTRIBUTING.md) for more detailed information.

## License 📜

This project is licensed under the [MIT License](LICENSE). See the [LICENSE](LICENSE) file for details.

## Support & Issues ℹ️

*   **GitHub Issues:** [https://github.com/pkibbey/media-manager/issues](https://github.com/pkibbey/media-manager/issues)
*   **Documentation (Future):**  We plan to provide comprehensive documentation in the future.

[Build Status Placeholder]
[License Badge Placeholder]
[Version Badge Placeholder]