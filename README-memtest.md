# Memory smoke test for noninput-mobile.html

Setup:
1. Node.js 16+ installed.
2. Copy package.json and memtest-noninput-mobile.js into repository root.
3. Run:
   npm install
   npx playwright install

Run:
node memtest-noninput-mobile.js --url="https://montagnikrea-source.github.io/SuslovPA/noninput-mobile.html" --iterations=40 --messages=20

Options:
--url            URL to test (required)
--iterations     how many cycles (default 30)
--delay          ms to wait after interactions (default 1000)
--messages       how many chat messages to send per iteration (default 10)
--clearChat      if true, clears chat between iterations (default false)
--operaExecutable path to Opera binary (to test Opera)
--headless       run headless (default true)
