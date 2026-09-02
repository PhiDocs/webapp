'use server';

import { getCompanyById } from '@/server/company-actions';
import { getWorks } from '@/server/work-actions';
import { getEmployees } from '@/server/employee-actions';
import { getAprProjects } from '@/server/apr-project-actions';
import { getResponsibleContacts } from '@/server/responsible-contact-actions';
import { getDocuments } from '@/server/document-actions';

/**
 * Carga inicial da tela de documentos, em uma unica ida ao servidor.
 *
 * Por que existe: server actions do Next sao serializadas. Um Promise.all com
 * seis actions no cliente nao paraleliza nada — vira uma fila de seis idas e
 * voltas. Medido na tela antiga: sete chamadas somando 5236ms, com o lote
 * inteiro levando 5350ms, ou seja, praticamente a soma.
 *
 * Aqui o Promise.all roda no servidor, onde as consultas de fato acontecem
 * ao mesmo tempo, e o cliente paga uma viagem so.
 *
 * Cada action ja faz a sua propria checagem de permissao, entao o
 * agrupamento nao afrouxa nada: continua tudo validado individualmente.
 */
export async function getReportsBootstrap(companyId: string) {
  const [company, works, employees, projects, responsibles, documents] = await Promise.all([
    getCompanyById(companyId),
    getWorks(companyId),
    getEmployees(companyId),
    getAprProjects(companyId),
    getResponsibleContacts(companyId),
    getDocuments(companyId),
  ]);

  return { company, works, employees, projects, responsibles, documents };
}
