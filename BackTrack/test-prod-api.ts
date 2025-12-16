// Teste da API do bilhete-tracker em produção
const BILHETE_TRACKER_URL = 'https://bilhete-tracker.onrender.com';

async function testProdAPI() {
  const imageUrl = 'https://i.imgur.com/example.jpg'; // URL fake apenas para ver a estrutura da resposta
  
  console.log('🌐 Testando API do bilhete-tracker em produção:');
  console.log(`   URL: ${BILHETE_TRACKER_URL}/api/process-image\n`);
  
  try {
    const response = await fetch(`${BILHETE_TRACKER_URL}/api/process-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
    });
    
    console.log(`📊 Status: ${response.status}`);
    const text = await response.text();
    console.log(`📦 Response (primeiros 500 chars):`);
    console.log(text.substring(0, 500));
    
    if (response.ok) {
      const data = JSON.parse(text);
      console.log('\n✅ Resposta parseada:');
      console.log('   Esporte:', data.esporte);
      console.log('   Evento:', data.evento);
      console.log('   Torneio:', data.torneio);
    }
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  }
}

testProdAPI();
