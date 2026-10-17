import { apiRequest } from "./httpClient.js";
export const listReceivables=()=>apiRequest("/api/contas-receber");
export const receivePayment=(id,data,key)=>apiRequest(`/api/contas-receber/${id}/recebimentos`,{method:"POST",headers:{"Idempotency-Key":key},body:JSON.stringify(data)});
export const reversePayment=(id,motivo)=>apiRequest(`/api/contas-receber/recebimentos/${id}/estornar`,{method:"POST",body:JSON.stringify({motivo})});
