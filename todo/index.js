// index.js
// Run with: node index.js
// Endpoint: http://localhost:5000/graphql

const express = require('express');
const cors = require('cors');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');

const app = express();
app.use(cors());

try {
  // 1) GraphQL schema: types, queries, mutations
  const schema = buildSchema(`
    enum Disease {
      Bulging_Eyes
      Cataracts
      Crossed_Eyes
      Glaucoma
      Uveitis
    }

    """An eye-disease record for a person"""
    type Record {
      id: ID!
      name: String!
      disease: Disease!
      dateAdded: String!  # ISO string
    }

    """Result for deletions"""
    type DeleteResult {
      success: Boolean!
      message: String!
      removed: Record
    }

    type Query {
      """Fetch all records"""
      records: [Record!]!

      """Fetch a single record by id"""
      record(id: ID!): Record
    }

    type Mutation {
      """Create a new record (dateAdded defaults to now if not provided)"""
      addRecord(name: String!, disease: Disease!, dateAdded: String): Record!

      """Update an existing record (only provided fields are changed)"""
      updateRecord(id: ID!, name: String, disease: Disease, dateAdded: String): Record!

      """Delete a record and return info"""
      deleteRecord(id: ID!): DeleteResult!
    }
  `);

  // 2) Dummy DB (in-memory) — 20 rows
  const DISEASES = ["Bulging_Eyes", "Cataracts", "Crossed_Eyes", "Glaucoma", "Uveitis"];

  let recordsData = [
    { id: "1",  name: "Aarav",     disease: "Cataracts",    dateAdded: "2025-01-05T09:10:00.000Z" },
    { id: "2",  name: "Ananya",    disease: "Glaucoma",     dateAdded: "2025-01-06T11:22:00.000Z" },
    { id: "3",  name: "Rahul",     disease: "Uveitis",      dateAdded: "2025-01-07T14:05:00.000Z" },
    { id: "4",  name: "Sneha",     disease: "Crossed_Eyes", dateAdded: "2025-01-08T08:45:00.000Z" },
    { id: "5",  name: "Neha",      disease: "Bulging_Eyes", dateAdded: "2025-01-09T12:30:00.000Z" },
    { id: "6",  name: "Vikram",    disease: "Cataracts",    dateAdded: "2025-01-10T16:40:00.000Z" },
    { id: "7",  name: "Kiran",     disease: "Glaucoma",     dateAdded: "2025-01-11T10:15:00.000Z" },
    { id: "8",  name: "Isha",      disease: "Uveitis",      dateAdded: "2025-01-12T07:55:00.000Z" },
    { id: "9",  name: "Rohan",     disease: "Crossed_Eyes", dateAdded: "2025-01-13T18:05:00.000Z" },
    { id: "10", name: "Priya",     disease: "Bulging_Eyes", dateAdded: "2025-01-14T09:00:00.000Z" },
    { id: "11", name: "Aditi",     disease: "Glaucoma",     dateAdded: "2025-01-15T13:25:00.000Z" },
    { id: "12", name: "Sahil",     disease: "Cataracts",    dateAdded: "2025-01-16T17:45:00.000Z" },
    { id: "13", name: "Kavya",     disease: "Uveitis",      dateAdded: "2025-01-17T06:35:00.000Z" },
    { id: "14", name: "Dev",       disease: "Crossed_Eyes", dateAdded: "2025-01-18T20:10:00.000Z" },
    { id: "15", name: "Meera",     disease: "Bulging_Eyes", dateAdded: "2025-01-19T08:20:00.000Z" },
    { id: "16", name: "Arjun",     disease: "Glaucoma",     dateAdded: "2025-01-20T15:55:00.000Z" },
    { id: "17", name: "Diya",      disease: "Cataracts",    dateAdded: "2025-01-21T11:05:00.000Z" },
    { id: "18", name: "Nikhil",    disease: "Uveitis",      dateAdded: "2025-01-22T12:45:00.000Z" },
    { id: "19", name: "Tanvi",     disease: "Crossed_Eyes", dateAdded: "2025-01-23T07:15:00.000Z" },
    { id: "20", name: "Ishan",     disease: "Bulging_Eyes", dateAdded: "2025-01-24T19:30:00.000Z" },
  ];
  let nextId = 21;

  // helpers
  const isValidDate = (val) => {
    if (!val) return false;
    const t = Date.parse(val);
    return !Number.isNaN(t);
  };
  const nowISO = () => new Date().toISOString();

  // 3) Resolvers
  const root = {
    // Queries
    records: () => recordsData,
    record: ({ id }) => recordsData.find(r => r.id === String(id)) || null,

    // Mutations
    addRecord: ({ name, disease, dateAdded }) => {
      if (!name || !name.trim()) throw new Error("Name is required.");
      if (!DISEASES.includes(disease)) {
        throw new Error(`Disease must be one of: ${DISEASES.join(', ')}`);
      }
      const date = dateAdded && isValidDate(dateAdded) ? new Date(dateAdded).toISOString() : nowISO();
      const newRecord = {
        id: String(nextId++),
        name: name.trim(),
        disease,
        dateAdded: date,
      };
      recordsData.push(newRecord);
      return newRecord;
    },

    updateRecord: ({ id, name, disease, dateAdded }) => {
      const rec = recordsData.find(r => r.id === String(id));
      if (!rec) throw new Error(`Record with id ${id} not found.`);

      if (typeof name === 'string') {
        if (!name.trim()) throw new Error("Name cannot be empty.");
        rec.name = name.trim();
      }
      if (typeof disease === 'string') {
        if (!DISEASES.includes(disease)) {
          throw new Error(`Disease must be one of: ${DISEASES.join(', ')}`);
        }
        rec.disease = disease;
      }
      if (typeof dateAdded === 'string') {
        if (!isValidDate(dateAdded)) throw new Error("dateAdded must be a valid ISO date/time.");
        rec.dateAdded = new Date(dateAdded).toISOString();
      }
      return rec;
    },

    deleteRecord: ({ id }) => {
      const idx = recordsData.findIndex(r => r.id === String(id));
      if (idx === -1) {
        return { success: false, message: `Record with id ${id} not found.`, removed: null };
      }
      const [removed] = recordsData.splice(idx, 1);
      return { success: true, message: `Record ${id} deleted successfully.`, removed };
    }
  };

  // 4) Hook up GraphQL (with GraphiQL IDE enabled)
  app.use('/graphql', graphqlHTTP({
    schema,
    rootValue: root,
    graphiql: true
  }));

  // 5) Start server
  const PORT = process.env.PORT || 5001;
  const server = app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}/graphql`);
  });

  // 6) Friendlier errors (e.g., port in use)
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Try: PORT=${Number(PORT) + 1} node index.js`);
    } else {
      console.error('❌ Server error:', err);
    }
    process.exit(1);
  });

} catch (err) {
  console.error('❌ Error starting server:', err);
}
