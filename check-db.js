const SQLite = require('expo-sqlite');

async function checkDB() {
  const db = await SQLite.openDatabaseAsync('budget.db');
  
  console.log('\n=== Schema Version ===');
  const version = await db.getFirstAsync('SELECT version FROM schema_version WHERE id = 1');
  console.log('Current version:', version);
  
  console.log('\n=== Category with ID 6 ===');
  const cat = await db.getFirstAsync("SELECT * FROM custom_categories WHERE id = '6'");
  console.log(cat);
  
  console.log('\n=== All categories ===');
  const cats = await db.getAllAsync('SELECT id, name FROM custom_categories ORDER BY position');
  console.log(cats);
}

checkDB().catch(console.error);
