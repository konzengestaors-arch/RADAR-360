'use strict';
// Validation-only adapter. No network requests and no private catalog access.
// Does not overwrite original records or claim official verification.
function digits(value){return String(value ?? '').replace(/\D/g,'');}
function validateBrasilApi(payload, requestedCnpj){
  if(!payload || typeof payload!=='object' || Array.isArray(payload))
    return {ok:false,reason:'invalid_payload'};
  const requested=digits(requestedCnpj), returned=digits(payload.cnpj);
  if(!/^\d{14}$/.test(requested)||returned!==requested)
    return {ok:false,reason:'cnpj_mismatch'};
  const name=typeof payload.razao_social==='string'?payload.razao_social.trim():'';
  if(!name || name.length>300)return {ok:false,reason:'missing_razao_social'};
  const situation=typeof payload.descricao_situacao_cadastral==='string'
    ?payload.descricao_situacao_cadastral.trim():null;
  return {ok:true,record:{cnpj:returned,razaoSocial:name,situacaoCadastral:situation},
    status:'candidate_for_manual_review'};
}
module.exports={validateBrasilApi};
