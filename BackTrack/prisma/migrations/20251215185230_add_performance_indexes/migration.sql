-- CreateIndex
CREATE INDEX "bankrolls_usuarioId_idx" ON "bankrolls"("usuarioId");

-- CreateIndex
CREATE INDEX "bankrolls_usuarioId_status_idx" ON "bankrolls"("usuarioId", "status");

-- CreateIndex
CREATE INDEX "bankrolls_usuarioId_ePadrao_idx" ON "bankrolls"("usuarioId", "ePadrao");

-- CreateIndex
CREATE INDEX "bets_bancaId_idx" ON "bets"("bancaId");

-- CreateIndex
CREATE INDEX "bets_bancaId_status_idx" ON "bets"("bancaId", "status");

-- CreateIndex
CREATE INDEX "bets_bancaId_dataJogo_idx" ON "bets"("bancaId", "dataJogo" DESC);

-- CreateIndex
CREATE INDEX "bets_bancaId_esporte_idx" ON "bets"("bancaId", "esporte");

-- CreateIndex
CREATE INDEX "bets_status_dataJogo_idx" ON "bets"("status", "dataJogo" DESC);

-- CreateIndex
CREATE INDEX "financial_transactions_bancaId_idx" ON "financial_transactions"("bancaId");

-- CreateIndex
CREATE INDEX "financial_transactions_bancaId_dataTransacao_idx" ON "financial_transactions"("bancaId", "dataTransacao" DESC);

-- CreateIndex
CREATE INDEX "financial_transactions_bancaId_tipo_idx" ON "financial_transactions"("bancaId", "tipo");

-- CreateIndex
CREATE INDEX "tipsters_usuarioId_idx" ON "tipsters"("usuarioId");

-- CreateIndex
CREATE INDEX "tipsters_usuarioId_ativo_idx" ON "tipsters"("usuarioId", "ativo");

-- CreateIndex
CREATE INDEX "users_telegramId_idx" ON "users"("telegramId");

-- CreateIndex
CREATE INDEX "users_statusConta_idx" ON "users"("statusConta");

-- CreateIndex
CREATE INDEX "users_planoId_idx" ON "users"("planoId");
