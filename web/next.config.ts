import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sem isso, o Next mantem o cache do router no cliente por 30s em paginas
  // dinamicas mesmo depois de um revalidatePath() no servidor - dados
  // recem-salvos (ex: emprestimo liquidado) so apareciam apos hard refresh.
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
