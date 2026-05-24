require('dotenv').config();
const { searchTracks } = require('../services/discovery');

async function run() {
  console.log('Harmoniq discovery test\n');

  const browse = await searchTracks('');
  console.log(`Browse (${browse.source}): ${browse.tracks.length} tracks`);
  if (browse.tracks[0]) {
    console.log(`  First: ${browse.tracks[0].artist} — ${browse.tracks[0].title}`);
    console.log(`  License: ${browse.tracks[0].license}`);
    console.log(`  Stream: ${browse.tracks[0].filepath?.slice(0, 80)}...`);
  }

  const search = await searchTracks('ambient');
  console.log(`\nSearch "ambient" (${search.source}): ${search.tracks.length} tracks`);
  search.tracks.slice(0, 3).forEach((track, index) => {
    console.log(`  ${index + 1}. ${track.artist} — ${track.title} [${track.license}]`);
  });
}

run().catch((error) => {
  console.error('Discovery test failed:', error.message);
  process.exit(1);
});
