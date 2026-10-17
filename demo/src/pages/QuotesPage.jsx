import { useEffect, useMemo, useRef, useState } from "react";
import Panel from "../components/Panel.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { listProducts } from "../services/productsApi.js";
import { listClients } from "../services/clientsApi.js";
import { cancelQuote, convertQuote, createQuote, listQuotes, updateQuote } from "../services/quotesApi.js";
import { saveQuotePdf } from "../services/quotePdf.js";
import { getDefaultPriceType, getProductPrice, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "../data/domain.js";
import { calculateSaleTotals } from "../services/sales.js";
import { formatCurrency, formatDateTime } from "../utils/formatters.js";

const STATUS_LABELS={RASCUNHO:"Rascunho",EMITIDO:"Emitido",CONVERTIDO:"Convertido",CANCELADO:"Cancelado"};
function futureDate(days=7){const date=new Date();date.setDate(date.getDate()+days);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;}
const emptyForm=()=>({id:null,versao:null,clienteId:"",validade:futureDate(),status:"RASCUNHO",descontoPercentual:"0",observacoes:"",itens:[]});

export default function QuotesPage(){
  const [data,setData]=useState({quotes:[],products:[],customers:[]});const [form,setForm]=useState(emptyForm);
  const [error,setError]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);
  const [productId,setProductId]=useState("");const [service,setService]=useState({descricao:"",preco:""});
  const [conversion,setConversion]=useState({id:null,formaPagamento:""});const attempts=useRef(new Map());
  const customer=data.customers.find(c=>String(c.id)===String(form.clienteId));const priceType=getDefaultPriceType(customer);
  const totals=useMemo(()=>calculateSaleTotals(form.itens.map(i=>({precoUnitario:i.precoUnitario,quantidade:i.quantidade})),form.descontoPercentual),[form.itens,form.descontoPercentual]);
  async function load(){try{const [quotes,products,customers]=await Promise.all([listQuotes(),listProducts(),listClients()]);setData({quotes,products,customers});setError("");}catch(failure){setError(failure.message);}}
  useEffect(()=>{load();},[]);
  function addProduct(){const product=data.products.find(p=>String(p.id)===productId);if(!product)return;const original=Number(getProductPrice(product,priceType));
    if(form.itens.some(i=>i.tipoItem==="PRODUTO"&&i.produtoId===product.id)){setError("O produto já está no orçamento.");return;}
    setForm(current=>({...current,itens:[...current.itens,{key:crypto.randomUUID(),tipoItem:"PRODUTO",produtoId:product.id,descricao:product.nome,quantidade:1,precoOriginal:original,precoUnitario:original,precoAlteradoManualmente:false}]}));setProductId("");}
  function addService(){const price=Number(service.preco);if(!service.descricao.trim()||!Number.isFinite(price)||price<0){setError("Informe descrição e preço válidos para o serviço.");return;}
    setForm(current=>({...current,itens:[...current.itens,{key:crypto.randomUUID(),tipoItem:"SERVICO",produtoId:null,descricao:service.descricao.trim(),quantidade:1,precoOriginal:price,precoUnitario:price,precoAlteradoManualmente:true}]}));setService({descricao:"",preco:""});}
  function updateItem(key,field,value){setForm(current=>({...current,itens:current.itens.map(item=>item.key===key?{...item,[field]:value,...(field==="precoUnitario"?{precoAlteradoManualmente:true}:{})}:item)}));}
  function editQuote(quote){setForm({id:quote.id,versao:quote.versao,clienteId:quote.clienteId?String(quote.clienteId):"",validade:quote.validade,status:quote.status,descontoPercentual:String(quote.descontoPercentual),observacoes:quote.observacoes||"",itens:quote.itens.map(i=>({key:`item-${i.id}`,tipoItem:i.tipoItem,produtoId:i.produtoId,descricao:i.descricaoItem,quantidade:i.quantidade,precoOriginal:i.precoOriginal,precoUnitario:i.precoUnitario,precoAlteradoManualmente:i.precoAlteradoManualmente}))});window.scrollTo({top:0,behavior:"smooth"});}
  async function save(event){event.preventDefault();if(form.itens.length===0){setError("Adicione ao menos um item.");return;}setBusy(true);setError("");try{const payload={clienteId:form.clienteId?Number(form.clienteId):null,itens:form.itens.map(({key,...item})=>({...item,quantidade:Number(item.quantidade),precoUnitario:Number(item.precoUnitario),precoOriginal:Number(item.precoOriginal)})),descontoPercentual:Number(form.descontoPercentual),validade:form.validade,status:form.status,observacoes:form.observacoes,versao:form.versao};if(form.id)await updateQuote(form.id,payload);else await createQuote(payload);setForm(emptyForm());setNotice("Orçamento salvo com sucesso.");await load();}catch(failure){setError(failure.message);}finally{setBusy(false);}}
  async function doCancel(quote){const motivo=prompt(`Motivo do cancelamento do orçamento ${quote.numero}:`);if(!motivo)return;try{await cancelQuote(quote.id,motivo);await load();}catch(failure){setError(failure.message);}}
  async function doConvert(){if(!conversion.formaPagamento)return;const payload={formaPagamento:conversion.formaPagamento,observacoes:null};const signature=JSON.stringify(payload);const previous=attempts.current.get(conversion.id);const attempt=previous?.signature===signature?previous:{key:crypto.randomUUID(),signature};attempts.current.set(conversion.id,attempt);setBusy(true);try{const sale=await convertQuote(conversion.id,payload,attempt.key);attempts.current.delete(conversion.id);setConversion({id:null,formaPagamento:""});setNotice(`Orçamento convertido na venda ${sale.numeroVenda}.`);await load();}catch(failure){setError(failure.message);}finally{setBusy(false);}}
  return <div className="page-stack quotes-page">
    <Panel title={form.id?`Editar orçamento ${data.quotes.find(q=>q.id===form.id)?.numero||""}`:"Novo orçamento"} description="Orçamentos não movimentam estoque, caixa ou faturamento.">
      {error&&<div className="feedback-message feedback-danger" role="alert">{error}</div>}{notice&&<div className="feedback-message feedback-success" role="status">{notice}</div>}
      <form onSubmit={save} className="quote-form">
        <div className="form-grid"><label>Cliente<select value={form.clienteId} onChange={e=>setForm({...form,clienteId:e.target.value})}><option value="">Consumidor não identificado</option>{data.customers.filter(c=>c.ativo).map(c=><option key={c.id} value={c.id}>{c.nomeRazaoSocial}</option>)}</select></label>
          <label>Validade<input type="date" min={futureDate(0)} value={form.validade} onChange={e=>setForm({...form,validade:e.target.value})} required/></label>
          <label>Estado<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="RASCUNHO">Salvar rascunho</option><option value="EMITIDO">Emitir orçamento</option></select></label>
          <label>Desconto (%)<input type="number" min="0" max="100" step="0.01" value={form.descontoPercentual} onChange={e=>setForm({...form,descontoPercentual:e.target.value})}/></label></div>
        <div className="quote-adders"><div><select value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Selecione um produto</option>{data.products.filter(p=>p.ativo).map(p=><option key={p.id} value={p.id}>{p.nome} · {formatCurrency(getProductPrice(p,priceType))}</option>)}</select><button type="button" className="secondary-button" onClick={addProduct}>Adicionar produto</button></div>
          <div><input placeholder="Descrição do serviço" maxLength="180" value={service.descricao} onChange={e=>setService({...service,descricao:e.target.value})}/><input type="number" min="0" step="0.01" placeholder="Preço" value={service.preco} onChange={e=>setService({...service,preco:e.target.value})}/><button type="button" className="secondary-button" onClick={addService}>Adicionar serviço</button></div></div>
        <div className="quote-items">{form.itens.map(item=><article key={item.key}><div><strong>{item.descricao}</strong><small>{item.tipoItem==="SERVICO"?"Serviço":"Produto"}</small></div><label>Qtd.<input type="number" min="1" value={item.quantidade} onChange={e=>updateItem(item.key,"quantidade",Number(e.target.value))}/></label><label>Preço<input type="number" min="0" step="0.01" value={item.precoUnitario} onChange={e=>updateItem(item.key,"precoUnitario",Number(e.target.value))}/></label><strong>{formatCurrency(Number(item.precoUnitario)*Number(item.quantidade))}</strong><button type="button" className="ghost-button" onClick={()=>setForm(current=>({...current,itens:current.itens.filter(i=>i.key!==item.key)}))}>Remover</button></article>)}</div>
        <label>Observações<textarea rows="3" value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})}/></label>
        <div className="quote-total"><span>Subtotal {formatCurrency(totals.subtotal)}</span><span>Desconto {formatCurrency(totals.desconto)}</span><strong>Total {formatCurrency(totals.total)}</strong></div>
        <div className="form-actions-pro">{form.id&&<button type="button" className="secondary-button" onClick={()=>setForm(emptyForm())}>Cancelar edição</button>}<button className="primary-button" disabled={busy}>{busy?"Salvando...":"Salvar orçamento"}</button></div>
      </form>
    </Panel>
    <Panel title="Histórico de orçamentos" description="Consulte, exporte, edite ou converta propostas comerciais.">
      {data.quotes.length===0?<EmptyState title="Nenhum orçamento" description="Os orçamentos salvos aparecerão aqui."/>:<div className="quote-history">{data.quotes.map(quote=><article key={quote.id}><div><span>{formatDateTime(quote.dataEmissao)}</span><strong>{quote.numero}</strong><small>{quote.clienteNome||"Consumidor não identificado"}</small></div><span className={`status-pill status-${quote.status.toLowerCase()}`}>{STATUS_LABELS[quote.status]}</span><strong>{formatCurrency(quote.total)}</strong><div className="form-actions-pro"><button className="secondary-button" onClick={()=>saveQuotePdf(quote)}>Salvar PDF</button>{["RASCUNHO","EMITIDO"].includes(quote.status)&&<><button className="secondary-button" onClick={()=>editQuote(quote)}>Editar</button><button className="danger-button" onClick={()=>doCancel(quote)}>Cancelar</button><button className="primary-button" onClick={()=>setConversion({id:quote.id,formaPagamento:""})}>Converter em venda</button></>}</div>
          {conversion.id===quote.id&&<div className="quote-conversion"><select value={conversion.formaPagamento} onChange={e=>setConversion({...conversion,formaPagamento:e.target.value})}><option value="">Forma de pagamento</option>{PAYMENT_METHODS.filter(method=>method!=="A_PRAZO").map(method=><option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>)}</select><button className="primary-button" disabled={busy||!conversion.formaPagamento} onClick={doConvert}>Confirmar conversão</button><button className="ghost-button" onClick={()=>setConversion({id:null,formaPagamento:""})}>Voltar</button></div>}</article>)}</div>}
    </Panel>
  </div>;
}
