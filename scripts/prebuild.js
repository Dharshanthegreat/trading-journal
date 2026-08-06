import fs from 'fs';

async function prebuild() {
  try {
    const res = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json');
    if (res.ok) {
      const data = await res.json();
      fs.writeFileSync('public/news.json', JSON.stringify(data));
      console.log('Successfully updated public/news.json');
    } else {
      console.log('Forex Factory fetch returned status:', res.status);
    }
  } catch (err) {
    console.log('Skipping news prebuild fetch:', err.message);
  }
}

prebuild();
