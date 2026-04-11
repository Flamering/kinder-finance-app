# Kinder Finance App

A modern React web application with a beautiful UI built using Vite, Tailwind CSS, and Lucide React icons.

## 🚀 Features

- **React 18** - Latest React with hooks
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Responsive Design** - Works on all screen sizes
- **GitHub Integration** - Ready for collaboration

## 📦 Tech Stack

| Technology | Purpose |
|------------|---------|
| React | UI Framework |
| Vite | Build Tool & Dev Server |
| Tailwind CSS | Styling |
| Lucide React | Icons |
| pnpm | Package Manager |
| GitHub | Version Control |

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (v8 or higher)
- Git & GitHub CLI

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Flamering/kinder-finance-app.git
   cd kinder-finance-app
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Start the development server:**
   ```bash
   pnpm dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173`

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |

## 🎨 Design System

The app uses a custom color palette:

```javascript
{
  primary: '#A7C7E7',    // Soft blue
  secondary: '#EAEAEA',  // Light gray
  tertiary: '#74739E',   // Purple-gray
  neutral: '#F7F9FB'     // Off-white
}
```

## 🔄 GitHub Workflow

### Making Changes

1. **Create a new branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create a Pull Request:**
   ```bash
   gh pr create --title "Your Feature" --body "Description of changes"
   ```

### Updating Local Repository

```bash
git pull origin main
```

## 📁 Project Structure

```
kinder-finance-app/
├── src/
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # Application entry point
│   ├── index.css        # Global styles & Tailwind
│   └── assets/          # Static assets
├── public/              # Public static files
├── index.html           # HTML template
├── package.json         # Dependencies & scripts
├── tailwind.config.js   # Tailwind configuration
├── postcss.config.js    # PostCSS configuration
└── vite.config.js       # Vite configuration
```

## 🚀 Deployment

### Build for Production

```bash
pnpm build
```

The optimized production files will be in the `dist/` folder.

### Deploy to GitHub Pages

1. Install gh-pages:
   ```bash
   pnpm add -D gh-pages
   ```

2. Add deploy script to package.json:
   ```json
   "scripts": {
     "deploy": "gh-pages -d dist"
   }
   ```

3. Deploy:
   ```bash
   pnpm build && pnpm deploy
   ```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 🔗 Links

- **Repository:** https://github.com/Flamering/kinder-finance-app
- **Issues:** https://github.com/Flamering/kinder-finance-app/issues

---

Built with ❤️ using React, Vite, and Tailwind CSS
