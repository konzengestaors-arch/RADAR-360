const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
test('pacote registra checkout real e hashes conferem com bytes produzidos',()=>{
 execFileSync(process.execPath,['scripts/build-android.cjs']);
 const manifest=JSON.parse(fs.readFileSync('dist/android/MANIFESTO.json'));
 assert.equal(manifest.commit,execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim());
 assert.equal(typeof manifest.alteracoesLocais,'boolean');
 assert.equal(manifest.arquivos.length,2);
 for(const item of manifest.arquivos){
  const bytes=fs.readFileSync('dist/android/'+item.nome);
  assert.equal(item.bytes,bytes.length);
  assert.equal(item.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));
 }
});
