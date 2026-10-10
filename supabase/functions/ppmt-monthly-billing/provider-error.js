// Return only known classifications or a bounded identifier, never provider prose.
export function providerErrorCode(payload) {
 const fields=[payload?.error,payload?.code,payload?.message,payload?.cause?.[0]?.code];
 if(fields.includes('invalid_token'))return 'invalid_token';
 const candidate=String(payload?.error||payload?.code||payload?.cause?.[0]?.code||'');
 return /^[A-Za-z0-9_-]{1,80}$/.test(candidate)?candidate:null;
}
