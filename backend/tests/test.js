async function seedData() {
  const token = process.argv[2]; // Pass JWT token as argument
  if (!token) {
    console.error("Please provide a JWT token as an argument: node test.js <token>");
    return;
  }

  const headers = { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  const baseUrl = 'http://localhost:5000/api/data';

  try {
    console.log("Seeding dummy data...");

    const fetchWithCheck = async (url, options) => {
      const res = await fetch(url, options);
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      return data;
    };

    // 1. Create a project
    const projData = await fetchWithCheck(`${baseUrl}/projects`, { method: 'POST', headers, body: JSON.stringify({ name: 'Test Project 1', budget: 100000 }) });
    const projectId = projData.id;
    console.log("Project created:", projectId);

    // 2. Create a client/person
    const clientData = await fetchWithCheck(`${baseUrl}/people`, { method: 'POST', headers, body: JSON.stringify({ name: JSON.stringify({ name: 'John Doe Client' }), phone: '1234567890' }) });
    const personId = clientData.id;
    console.log("Person created:", personId);

    // 3. Create a parent category
    const catData = await fetchWithCheck(`${baseUrl}/categories`, { method: 'POST', headers, body: JSON.stringify({ name: 'Operations (Parent)', type: 'Expense' }) });
    const parentCatId = catData.id;
    console.log("Parent category created:", parentCatId);

    // 4. Create a sub category
    const subCatData = await fetchWithCheck(`${baseUrl}/categories`, { method: 'POST', headers, body: JSON.stringify({ name: 'Software Licenses (Child)', type: 'Expense', parent_id: parentCatId }) });
    const subCatId = subCatData.id;
    console.log("Sub category created:", subCatId);

    // 5. Create a transaction
    const txData = await fetchWithCheck(`${baseUrl}/transactions`, { 
      method: 'POST', 
      headers, 
      body: JSON.stringify({
        project_id: projectId,
        party_id: personId,
        category_id: subCatId,
        amount: 500,
        type: 'Expense',
        description: 'Buying IDE License',
        paymentMethod: 'Net Banking',
        date: new Date().toISOString().split('T')[0]
      }) 
    });
    console.log("Transaction created:", txData.id);

    console.log("All dummy data seeded successfully! End-to-end flow verified.");

  } catch (err) {
    console.error("Error seeding data:", err);
  }
}

seedData();
