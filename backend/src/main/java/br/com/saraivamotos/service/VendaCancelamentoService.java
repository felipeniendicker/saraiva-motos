package br.com.saraivamotos.service;
import br.com.saraivamotos.dto.*;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class VendaCancelamentoService {
    private final VendaService vendas; private final CaixaService caixas;
    public VendaCancelamentoService(VendaService vendas, CaixaService caixas){this.vendas=vendas;this.caixas=caixas;}
    @Transactional public VendaResponse cancelar(Long id, CancelamentoVendaRequest request, AuthenticatedUser user){
        VendaResponse response=vendas.cancelar(id, request); caixas.registrarCancelamento(response,user); return response;
    }
}
