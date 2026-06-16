const bcrypt = require('bcrypt'); 

async function gerarSenha() {
    const senhaPura = '';
    const saltRounds = 10; 
    
    const hash = await bcrypt.hash(senhaPura, saltRounds);
    console.log('Copie este hash:', hash);
}
