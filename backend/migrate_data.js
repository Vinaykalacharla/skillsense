const { MongoClient } = require('mongodb');

const oldUri = 'mongodb+srv://babu:Tarun%40143@babupersonal.lzqt1ym.mongodb.net/skillsense?retryWrites=true&w=majority&appName=babupersonal';
const newUri = 'mongodb+srv://vinay:Vinay%40143@cluster0.s1uoac0.mongodb.net/skillsense?appName=Cluster0';

async function migrate() {
  console.log('Connecting to old database...');
  const oldClient = new MongoClient(oldUri);
  await oldClient.connect();
  const oldDb = oldClient.db('skillsense');

  console.log('Connecting to new database...');
  const newClient = new MongoClient(newUri);
  await newClient.connect();
  const newDb = newClient.db('skillsense');

  const collections = await oldDb.listCollections().toArray();
  console.log(`Found ${collections.length} collections in old database.`);

  for (const collInfo of collections) {
    const collName = collInfo.name;
    console.log(`Migrating collection: ${collName}`);
    const oldColl = oldDb.collection(collName);
    const newColl = newDb.collection(collName);

    const docs = await oldColl.find({}).toArray();
    if (docs.length > 0) {
      // Clear new collection first to avoid duplicates
      await newColl.deleteMany({});
      await newColl.insertMany(docs);
      console.log(`  -> Copied ${docs.length} documents into ${collName}`);
    } else {
      console.log(`  -> No documents in ${collName}, skipping.`);
    }
  }

  console.log('Migration complete!');
  await oldClient.close();
  await newClient.close();
}

migrate().catch(console.error);
