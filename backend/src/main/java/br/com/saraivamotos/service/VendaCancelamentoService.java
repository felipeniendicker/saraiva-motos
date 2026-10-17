package br.com.saraivamotos.service;
import br.com.saraivamotos.dto.*;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class VendaCancelamentoService {
    private final VendaService vendas; private final CaixaService caixas;private final ContaReceberService contas;
    public VendaCancelamentoService(VendaService vendas, CaixaService caixas,ContaReceberService contas){this.vendas=vendas;this.caixas=caixas;this.contas=contas;}
    @Transactional public VendaResponse cancelar(Long id, CancelamentoVendaRequest request, AuthenticatedUser user){
        contas.prepararCancelamento(id);VendaResponse response=vendas.cancelar(id, request); caixas.registrarCancelamento(response,user); return response;
    }
}
