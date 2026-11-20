import Image from "next/image";
import { getCurrentProfile } from "@/lib/auth";
import { ControleInatividade } from "@/components/auth/inatividade";
import { CabecalhoModulos } from "@/components/layout/cabecalho-modulos";

// Tela de boas-vindas (aberta apos o login e pelo logo do cabecalho): so o
// cabecalho com os modulos e a foto da lavoura com a marca Nayme. Os cards dos
// modulos sairam daqui - o cabecalho fixo ja leva a cada um deles.
export default async function InicioPage() {
  await getCurrentProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <ControleInatividade />
      <CabecalhoModulos comTema />
      {/* Mesma foto do fundo do sistema, com pelicula mais leve que a das
          outras telas (65%) para a marca aparecer. */}
      <div aria-hidden className="fixed inset-0 -z-10">
        <Image src="/nayme-watermark.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-background/25" />
      </div>
    </div>
  );
}
