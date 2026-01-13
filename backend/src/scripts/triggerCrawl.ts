
const PORT = process.env.PORT || 3001;
const URL = `http://localhost:${PORT}/api/crawl`;

console.log(`Triggering crawl at ${URL}...`);

fetch(URL, { method: 'POST' })
  .then(res => {
    if (res.ok) {
      console.log('✅ Crawl started successfully. Check server logs for progress.');
    } else {
      console.error(`❌ Failed to start crawl: ${res.status} ${res.statusText}`);
    }
  })
  .catch(err => {
    console.error('❌ Error connecting to server:', err.message);
    console.log('Make sure the backend server is running first!');
  });
