const axios = require('axios');
async function testApi() {
  try {
    const loginRes = await axios.post('http://localhost:5000/auth/login', {
      email: 'owner@property.com', password: 'password123'
    });
    const cookies = loginRes.headers['set-cookie'];
    const getRes = await axios.get('http://localhost:5000/suppliers', {
      headers: { Cookie: cookies.join('; ') }
    });
    const firstSupplier = getRes.data[0];
    
    if (firstSupplier) {
      console.log('Testing delete for:', firstSupplier.id);
      const deleteRes = await axios.delete(`http://localhost:5000/suppliers/${firstSupplier.id}`, {
        headers: { Cookie: cookies.join('; ') }
      });
      console.log('Delete success:', deleteRes.data);
    }
  } catch (err) {
    if (err.response) {
      console.error('API Error:', err.response.status, err.response.data);
    } else {
      console.error('Network Error:', err.message);
    }
  }
}
testApi();
