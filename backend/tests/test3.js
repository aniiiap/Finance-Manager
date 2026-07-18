const token = process.argv[2];
const headers = { 
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
const baseUrl = 'http://localhost:5000/api/data';

async function runTest() {
  try {
    // 1. Create a client with company and status
    const clientRes = await fetch(`${baseUrl}/people`, { 
      method: 'POST', 
      headers, 
      body: JSON.stringify({ name: 'Integration Test Client', contact: '9999', company: 'Corp', status: 'Active' }) 
    });
    const clientData = await clientRes.json();
    console.log("Client created:", clientData);

    // 2. Create a project assigned to that client
    const projRes = await fetch(`${baseUrl}/projects`, { 
      method: 'POST', 
      headers, 
      body: JSON.stringify({ name: 'Integration Test Project', budget: 50000, client_id: clientData.id }) 
    });
    const projData = await projRes.json();
    console.log("Project created:", projData);

    // 3. Fetch projects to ensure it joins correctly
    const allProjRes = await fetch(`${baseUrl}/projects`, { headers });
    const allProjData = await allProjRes.json();
    const fetchedProj = allProjData.find(p => p.id === projData.id);
    console.log("Fetched project client name:", fetchedProj.client);
    
    if (fetchedProj.client === 'Integration Test Client') {
      console.log("SUCCESS! Client ID linked to Project properly.");
    }

  } catch(e) {
    console.error("Test failed:", e);
  }
}
runTest();
