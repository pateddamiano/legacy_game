# First Off - Brooklyn Street Mini Game

A web-based mini game inspired by Brooklyn street culture and hip-hop vibes, featuring Tireek and Tryston from rap group "++".

## 🎮 Game Features

- **Dual Character System**: Play as Tireek (punch attack) or Tryston (yell knockback)
- **Progressive Difficulty**: Game speed increases over time
- **Mobile Compatible**: Touch controls for mobile devices
- **Local High Scores**: Saves your best score locally
- **PWA Ready**: Can be installed as a Progressive Web App

## 🚀 Quick Start

### Option 1: Local Development
1. Download all files to a folder
2. Open `index.html` in a web browser
3. Start playing!

### Option 2: Web Hosting

#### GitHub Pages (Free)
1. Create a new repository on GitHub
2. Upload all files to the repository
3. Go to Settings > Pages
4. Select "Deploy from a branch" > "main" > "/ (root)"
5. Your game will be available at `https://yourusername.github.io/repository-name`

#### Netlify (Free)
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop your game folder onto Netlify
3. Your game will be live instantly with a random URL
4. Optional: Connect to GitHub for automatic updates

#### Vercel (Free)
1. Go to [vercel.com](https://vercel.com)
2. Connect your GitHub repository
3. Deploy with one click
4. Your game will be live at `https://your-project.vercel.app`

#### Firebase Hosting (Free)
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Run `firebase login`
3. Run `firebase init hosting`
4. Select your project folder
5. Run `firebase deploy`

## 🎯 Game Controls

### Desktop
- **Arrow Keys**: Move left/right and jump
- **Space**: Switch between characters
- **Enter**: Use super move

### Mobile
- **Touch Controls**: Tap the on-screen buttons
- **Auto-detection**: Touch controls appear automatically on mobile

## 🛠 File Structure

```
mini-game++/
├── index.html          # Main HTML file
├── game.js            # Game logic and mechanics
├── styles.css         # Styles and responsive design
├── manifest.json      # PWA manifest
└── README.md          # This file
```

## 🎵 Game Mechanics

- **Objective**: Survive 3 minutes to collect the song fragment
- **Obstacles**: Spinning vinyl records, gangsters, homeless people
- **Power-ups**: Collect microphones to reduce super move cooldown
- **Characters**:
  - **Tireek**: Powerful punch that clears enemies ahead
  - **Tryston**: Yell that knocks back all enemies on screen

## 🌐 Browser Compatibility

Tested and compatible with:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📱 Mobile Features

- Responsive design that adapts to screen size
- Touch-optimized controls
- Prevents zoom and scroll issues
- PWA installation support

## 🔧 Customization

### Changing Game Speed
Edit `game.js` line with `this.gameSpeed = 1 + (180 - this.gameTime) * 0.01`

### Modifying Characters
Edit the `characters` object in `game.js` to change colors, names, or abilities

### Styling Updates
Modify `styles.css` to change colors, fonts, or layout

## 🚨 Troubleshooting

### Game Won't Load
- Check browser console for errors
- Ensure all files are in the same directory
- Try a different browser

### Touch Controls Not Working
- Ensure you're on a touch device
- Check that JavaScript is enabled
- Try refreshing the page

### Performance Issues
- Close other browser tabs
- Try a newer browser version
- Check if hardware acceleration is enabled

## 📄 License

This game is provided as-is for educational and entertainment purposes.

## 🤝 Contributing

Feel free to fork this project and make improvements! Some ideas:
- Add sound effects
- Create additional characters
- Implement multiplayer features
- Add more obstacle types

---

**Ready to play? Open `index.html` in your browser and start dodging those Brooklyn streets!**