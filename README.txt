React dependencies fix for Soup Training Run Monitor

Replace the project's root package.json with this package.json.
Then open a terminal in the same folder as package.json and run:

  npm install
  npm run build

The manifest declares react, react-dom, react-router-dom and matching React 18 type packages.
Vercel Root Directory must point to the directory containing this package.json.
