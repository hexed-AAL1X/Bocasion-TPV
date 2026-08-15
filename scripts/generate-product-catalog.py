#!/usr/bin/env python3
"""Genera src/data/productCatalog.ts desde docs/paloteo.xls (Codigo, Producto, Precio)."""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path

import xlrd

ROOT = Path(__file__).resolve().parents[1]
XLS = ROOT / "docs" / "paloteo.xls"
OUT = ROOT / "src/data/productCatalog.ts"
GROUPS_OUT = ROOT / "src/data/productGroups.ts"
ASSIGNMENTS_DIR = ROOT / "scripts"
DOCS_DIR = ROOT / "docs"

PRODUCT_GROUPS = [
    "Empresas",
    "Gaseosas",
    "Sandwich's Vitrina",
    "Bebidas Calientes",
    "Bebidas Frías",
    "Bocaditos Dulces",
    "Bocaditos Salados",
    "Vegetariano",
    "Ensaladas Regular",
    "Regular",
    "Bistec",
    "Broaster",
    "Chaufa",
    "Complementos",
    "Entradas Carta",
    "Sopas",
    "Hamburguesas y Sandwiches",
    "Milanesa",
    "Kekes",
    "Tortas",
    "Postres Varios",
    "Postre de Vitrina",
    "Postre de Menú",
    "Helados",
    "Rehidratantes",
    "Frugos",
    "Fruta",
    "Jugos y otros",
    "Yogurt Bebible",
    "Aguas Saborizadas",
    "Cheessecake Y Otros",
    "Aguas",
    "Confiteria",
    "Snacks Saludables",
    "Snack",
    "Galletas",
    "Energizantes",
]

# Capturas ERP — solo para reportes de pendientes (no asignar automáticamente).
ERP_BEBIDAS_FRIAS = [
    "CARAMBOLA BD",
    "CHICHA MORADA",
    "CHICHA MORADA 12 OZ",
    "CHICHA MORADA 16 OZ",
    "DURAZNO BD",
    "FRESA CON MENTA",
    "JUGO DE PLATANO Y LECHE 12 OZ",
    "JUGO DE FRESA 12 OZ",
    "JUGO DE FRESA 16 OZ",
    "JUGO DE FRESA CON LECHE 12 OZ",
    "JUGO DE FRESA CON LECHE 16 OZ",
    "JUGO DE FRESA CON LECHE DE SOYA 16 OZ",
    "JUGO DE FRESA CON LECHE DE SOYA 12 OZ",
    "JUGO DE FRESA CON LECHE DESLACTOSADA 16 OZ",
    "JUGO DE FRESA CON LECHE DESLACTOSADA 12 OZ",
    "JUGO DE FRESA SIN AZUCAR 16 OZ",
    "JUGO DE LUCUMA Y LECHE 16 OZ",
    "JUGO DE MANGO 12 OZ",
    "JUGO DE MANGO 16 OZ",
    "JUGO DE MANGO CON LECHE 12 OZ",
    "JUGO DE MANGO CON LECHE 16 OZ",
    "JUGO DE MANGO CON PINA 12 OZ",
    "JUGO DE NARANJA 12 OZ",
    "JUGO DE NARANJA 16 OZ",
    "JUGO DE PAPAYA 12 OZ",
    "JUGO DE PAPAYA 16 OZ",
    "JUGO DE PAPAYA CON PINA 12 OZ",
    "JUGO DE PAPAYA CON PINA 16 OZ",
    "JUGO DE PINA 12 OZ",
    "JUGO DE PINA 16 OZ",
    "JUGO DE PLATANO Y LECHE 16 OZ",
    "JUGO SURTIDO 12 OZ",
    "JUGO SURTIDO 16 OZ",
    "JUGO SURTIDO ESPECIAL 12 OZ",
    "JUGO SURTIDO ESPECIAL 16 OZ",
    "LIMONADA",
    "LIMONADA 12 OZ",
    "LIMONADA 16 OZ",
    "MANZANA BD",
    "MANZANILLA BD",
    "MANZANILLA CON PINA",
    "MARACUYA 12 OZ",
    "MARACUYA 16 OZ",
    "NARANJADA",
    "PINA CON MENTA",
    "REFRESCO CHICHA MORADA",
    "REFRESCO CHICHA MORADA 500 ML",
    "REFRESCO DEL DIA",
    "JUGO DE LUCUMA CON LECHE",
    "BOTELLA DE CHICHA MORADA 340 ML",
    "BOTELLA DE MARACUYA 340 ML",
    "LECHE DESLACTOSADA ADICIONAL",
    "VASO DE REFRESCO",
]

ERP_REHIDRATANTES = [
    "POWER RADE MORA AZUL 500 ML",
    "POWER RADE LIMA LIMON 500 ML",
    "POWER RADE MANDARINA 500 ML",
    "POWER RADE MULTIFRUTAS 500 ML",
    "SPORADE APPLE ICE PET 500 ML",
    "SPORADE BLUEBERRY PET 500 ML",
    "SPORADE MANDARINA PET 500 ML",
    "SPORADE MARACUYA PET 500 ML",
    "SPORADE TROPICAL PET 500 ML",
    "GATORADE 500 ML",
]

ERP_CONFITERIA = [
    "BESOS DE MOSA CAJA DE",
    "CHOCMAN",
    "CHOCOLATE SUBLIME SONRISA 1.40G",
    "CHOCOLATE TRIANGULO DE LECHE 30GR",
    "WAFER CUA CUA CAJA",
    "WAFER RELLENO",
    "PANETON",
    "CHOCOLATE PRINCESA",
    "TRIDENT",
    "MENTITAS",
    "CHUPETIN GLOBO POP",
    "GELATINA 8 ONZAS",
    "HALLS",
    "TRIPLE CON DURAZNO",
    "PAN CON PALTA",
    "PAN CON OMELET",
    "FILETE DE POLLO CON PAPAS FRITAS Y ARROZ",
    "HAMBURGUESA AL PLATO CON PAPAS FRITAS",
    "SAND. DE QUESO FRESCO Y ACEITUNA EN PA",
    "PAN CON HUEVO",
    "CHOCOLATE VIZZIO",
    "PIZZA EN CONO",
    "SNICKERS",
    "CHOCOLATE TUYO",
    "CHOCOLATE OBSESION",
    "TRIANGULO CHOCOLATE",
    "MENTITAS 1",
    "GOMITAS TRULULU",
    "CARAMELO MENTITAS",
    "CHOCOLATE BIG BEN",
    "GOMITAS FINNI",
    "CHOCOLATE GOLPE",
    "MASMELOW TRULULU",
    "FOCHIS PASAS",
    "BON O BON",
    "SNICKERS 21G",
    "LENTEJITAS 16 G",
    "MENTOS",
    "CHIN CHIN CHOCOLATE",
    "WINTER KREMANI O FLOW",
    "SPARKIES",
    "GARBANCHO",
    "BARRA DE CEREAL QFOODS",
    "BARRA ENERGETICA QFOODS",
    "CHIPS DE QUINOA CON GUACAMOLE",
    "PINGUINOS BIMBO",
    "NITO BIMBO",
    "GANSITO BIMBO",
    "BOX 1 (6 GALLETAS + 2 MANGAS)",
    "BOX 2 (12 GALLETAS + 3 MANGAS)",
    "BOX 3 (20 GALLETAS + 4 MANGAS)",
    "PANETON GLASS NARANJA",
    "PANETON CREMA PASTELERA",
    "PANETON FUDGE",
    "CANASTA NAVIDEÑA EJECUTIVA",
    "CANASTA NAVIDEÑA BASICA",
]

ERP_SANDWICHS_VITRINA = [
    "CROISANT DE POLLO",
    "CROISANT DE POLLO CON PECANAS",
    "CROISSANT MIXTO",
    "CROISSAN DE POLLO CON PINA",
    "CROISSAN DE POLLO CON JAMON Y QUESO",
    "CROISSANT DE POLLO CON DURAZNO",
    "HAMBURGUESA",
    "HAMBURGUESA CON HUEVO",
    "HAMBURGUESA CON QUESO",
    "HAMBURGUESA DE LA CASA",
    "HAMBURGUESA ROYAL",
    "MIXTO CALIENTE",
    "MIXTO COMPLETO",
    "PITA CAPRESSE",
    "PITA CON JAMON DE PAVO",
    "PITA CON PALTA",
    "PITA CON POLLO",
    "PITA CON POLLO Y DURAZNO",
    "PITA CON POLLO Y PALTA",
    "PITA CON POLLO Y PECANAS",
    "PITA CON POLLO Y QUESO EDAM",
    "PITA CON QUESO FRESCO",
    "PITA DE QUESO FRESCO Y JAMON DE PAVO",
    "PITA INTEGRAL CAPRESSE",
    "PITA INTEGRAL CON JAMON DE PAVO",
    "PITA INTEGRAL CON PALTA",
    "PITA INTEGRAL CON POLLO",
    "PITA INTEGRAL CON POLLO Y DURAZNO",
    "PITA INTEGRAL CON POLLO Y PALTA",
    "PITA INTEGRAL CON POLLO Y PECANAS",
    "PITA INTEGRAL CON POLLO Y QUESO EDAM",
    "PITA INTEGRAL CON QUESO FRESCO",
    "PITA INTEGRAL DE QUESO FRESCO Y JAMON DE",
    "PITA INTEGRAL MIXTO",
    "PITA INTEGRAL MIXTO COMPLETO",
    "PITA MIXTO",
    "PITA MIXTO COMPLETO",
    "SANDWICH ALEMAN",
    "SANDWICH BUTIFARRA",
    "SANDWICH CON MILANESA JUNIOR",
    "SANDWICH DE CHICHARRON",
    "SANDWICH DE CHORIZO",
    "SANDWICH DE FILETE",
    "SANDWICH DE FILETE CON PALTA",
    "SANDWICH DE HOT DOG",
    "SANDWICH DE JAMON+ QUESO Y SALAME",
    "SANDWICH DE LOMITO",
    "SANDWICH DE LOMO CON CHAMPINONES",
    "SANDWICH DE MILANESA",
    "SANDWICH DE OMELETTE DE JAMON",
    "SANDWICH DE POLLO CIABATTA",
    "SANDWICH DE POLLO CON CHAMPINONES",
    "SANDWICH DE POLLO EN PAN HAMBURGUESA",
    "SANDWICH FRANKFURTER",
    "SANDWICH FRANKFURTER CON QUESO",
    "SANDWICH FRANKFURTER QUESO TOCINO",
    "SANDWICH PANINI CON POLLO",
    "SANDWICH PANINI CON POLLO Y PECANAS",
    "SANDWICH PARRILLERO DE CARNE",
    "SANDWICH PARRILLERO DE POLLO",
    "SANDWICH PODEROSO",
    "SANDWICH PROTEICO",
    "SANDWICH ROYAL",
    "TRIPLE CLASICO",
    "TRIPLE DE ACEITUNA",
    "TRIPLE DE JAMON+ HUEVO Y POLLO",
    "TRIPLE ESPECIAL",
    "TRIPLE VEGETARIANO",
    "SANDWICH PANINI CON POLLO Y DURAZNO",
    "SANDWICH PARRILLERO DE CHORIZO",
    "COMBO (AVENA + PAN CON HUEVO)",
    "COMBO SANDWICH + EPIC",
    "CROISSANT HUEVO TOCINO",
    "COMBO 2: CANCHITA POPCORN + REFRESCO",
    "COMBO 3: SNACK + GASEOSA",
    "TRIPLE POLLO, JAMON Y DURAZNO",
    "SANDWICH TRES JAMONES",
    "SANDWICH DE POLLO JUNIOR",
    "SANDWICH QUESO BURGUER",
    "CROISSANT MIXTO COMPLETO",
]

ERP_BISTEC = [
    "BISTEC A LA PLANCHA CON TALLARINES VERD",
    "BISTEC A LA PLANCHA CON ENSALADA COCIDA",
    "BISTEC A LA PLANCHA CON ENSALADA FRESCA",
    "BISTEC A LA PLANCHA CON PAPA SANCOCHADA",
    "BISTEC A LA PLANCHA CON PAPAS FRITAS Y ARROZ",
    "BISTEC A LO POBRE",
    "BISTEC A LO POBRE - CHICO",
    "BISTEC A LO POBRE - PARA LLEVAR",
]

ERP_BROASTER = [
    "BROASTER CON ARROZ CHAUFA",
    "BROASTER CON ENSALADA Y ARROZ",
    "BROASTER CON PAPAS FRITAS Y ARROZ",
    "CHICHARRON DE POLLO CON PAPAS FRITAS Y ENSALADA",
    "ALITAS BBQ 2X1 + BEBIDA",
    "BROASTER",
]

ERP_COMPLEMENTOS = [
    "PAPAS FRITAS PORCION 150GR",
    "PAPAS FRITAS PORCION 300GR",
    "PORCION DE HOT DOG EXTRA",
    "PORCION DE ARROZ",
    "PORCION DE ENSALADA",
    "PORCION DE HUEVO FRITO",
    "PORCION DE HUEVO SANCOCHADO",
    "PORCION DE PALTA",
    "PORCION DE PLATANO FRITO",
    "PORCION DE PAPA FRITA",
]

ERP_ENTRADAS_CARTA = [
    "CAUSA CON CHICHARRON DE POLLO ESCABECHADO",
    "CAUSA DE ATUN",
    "CAUSA DE POLLO",
    "CAUSA DE VERDURAS",
    "CAUSA VEGETARIANA",
    "PALTA A LA REINA",
    "PALTA RELLENA",
    "PAPA A LA HUANCAINA",
    "PAPA CON OCOPA",
    "PAPA RELLENA CON ZARZA CRIOLLA",
    "PASTEL DE CHOCLO",
    "TEQUENOS DE QUESO CON GUACAMOLE",
    "YUQUITAS CON HUANCAINA",
    "YUQUITAS CON TARTARA",
]

ERP_HAMBURGUESAS_Y_SANDWICHES = [
    "1/2 CLUB SANDWICH",
    "CLUB SANDWICH",
    "HAMBURGUESA A LO POBRE CON PAPAS FRITAS",
    "HAMBURGUESA CLASICA CON PAPAS FRITAS",
    "HAMBURGUESA CON QUESO Y PAPAS FRITAS",
    "HAMBURGUESA DOBLE CARNE CON PAPAS FRITAS",
    "HAMBURGUESA DOBLE CARNE QUESO TOCINO CON PAPAS FRITAS",
    "HAMBURGUESA PARRILLERA",
    "HAMBURGUESA QUESO TOCINO CON PAPAS FRITAS",
    "HAMBURGUESA ROYAL CON PAPAS FRITAS",
    "HAMBURGUESA ROYAL CON TOCINO Y PAPAS FRITAS",
]

ERP_MILANESA = [
    "MILANESA A LO POBRE",
    "MILANESA CON ENSALADA COCIDA Y ARROZ",
    "MILANESA CON ENSALADA COCIDA Y ARROZ - CHICO",
    "MILANESA CON ENSALADA FRESCA Y ARROZ",
    "MILANESA CON ENSALADA FRESCA Y ARROZ - CHICO",
    "MILANESA CON ENSALADA FRESCA Y PAPA FRITAS",
    "MILANESA CON PAPA SANCOCHADA Y ARROZ",
    "MILANESA CON PAPA SANCOCHADA Y ARROZ - CHICO",
    "MILANESA CON PAPAS FRITAS Y ARROZ",
    "MILANESA CON PAPAS FRITAS Y ARROZ - CHICO",
    "MILANESA CON TALLARINES VERDES",
    "MILANESA A LO POBRE JUMBO",
]

ERP_POSTRE_DE_VITRINA = [
    "ARROZ CON LECHE 8 ONZ",
    "ARROZ ZAMBITO 8 ONZ",
    "FLAN 8 ONZ",
    "FLAN CON GELATINA 8 ONZ",
    "FLAN DE MANJAR 8 ONZ",
    "GELATINA BATIDA DE FRESA 8 ONZ",
    "GELATINA BATIDA DE PINA 8 ONZ",
    "GELATINA DE FRESA 8 ONZ",
    "GELATINA DE FRESA LIGTH 6 ONZ",
    "GELATINA DE MENTA 8 ONZ",
    "GELATINA DE MENTA LIGTH 6 ONZ",
    "GELATINA DE NARANJA 8 ONZ",
    "GELATINA DE NARANJA LIGTH 6 ONZ",
    "GELATINA DE PINA 8 ONZ",
    "GELATINA DE PINA LIGTH 6 ONZ",
    "KEKE MARMOLEADO PORCION",
    "MAZAMORRA MORADA 8 ONZ",
    "PUDIN DE CHOCOLATE 8 ONZ",
    "PUDIN DE VAINILLA 8 ONZ",
]

ERP_POSTRE_DE_MENU = [
    "ARROZ CON LECHE",
    "ARROZ ZAMBITO",
    "COMPOTA DE AGUAYMANTO",
    "COMPOTA DE MANZANA",
    "COMPOTA DE MEMBRILLO",
    "COMPOTA DE NARANJA",
    "COMPOTA DE PINA",
    "COMPOTA DE TAMARINDO",
    "COMPOTA TUTTIFRUTTI",
    "FLAN 4 ONZ",
    "FLAN DE CHOCOLATE 4 ONZ",
    "FLAN DE MANJAR 4 ONZ",
    "GELATINA BATIDA DE FRESA 4 ONZ",
    "GELATINA BATIDA DE PINA 4 ONZ",
    "GELATINA DE FRESA 4 ONZ",
    "GELATINA DE MENTA 4 ONZ",
    "GELATINA DE MENTA LIGTH 4 ONZ",
    "GELATINA DE NARANJA 4 ONZ",
    "GELATINA DE PINA 4 ONZ",
    "GELATINA DE PINA LIGTH 4 ONZ",
    "KEKE DE CHOCOLATE MN",
    "KEKE DE HIGO MN",
    "KEKE DE VAINILLA MN",
    "KEKE MARACUYA MN",
    "MAZAMORRA COCHINA",
    "MAZAMORRA DE DURAZNO",
    "MAZAMORRA DE ZAPALLO",
]

ERP_REGULAR = [
    "FILETE DE SOYA",
    "HAMBURGUESA DE SOYA",
    "LATA DE ATUN",
    "MILANESA DE SOYA",
    "PECHUGA A LA PLANCHA",
    "PECHUGA CROCANTE",
    "PECHUGA ORIENTAL",
    "PECHUGA SANCOCHADA",
    "RES MECHADA",
    "MILANESA DE SOYA JUMBO",
    "MILANESA DE SOYA SIMPLE",
    "MILANESA DE SOYA SIMPLE JUMBO",
    "PECHUGA A LA PLANCHA JUMBO",
]

ERP_SOPAS = [
    "A LA MINUTA",
    "CALDILLO DE HUEVOS",
    "CALDO BLANCO DE POLLO",
    "CALDO DE GALLINA MN",
    "CALDO DE POLLO",
    "CAZUELA DE CARNE",
    "CAZUELA DE POLLO",
    "CAZUELA DE VERDURAS",
    "CHILCANO DE POLLO",
    "CHILENA",
    "CHINA DE POLLO",
    "CHUPE CUZQUENO",
    "CHUPE DE HABAS",
    "CHUPE DE OLLUCOS",
    "CHUPE DE PAPAS",
    "CHUPE DE VERDURAS",
    "CHUPE DE VIERNES",
    "CHUPE DE ZAPALLO",
    "CHUPE PACHAMANQUERO",
    "CHUPE ROJO",
    "CHUPE VERDE",
    "CONSOME DE CARNE",
    "CONSOME DE POLLO",
    "CREMA DE ESPINACAS",
    "CREMA DE PORO",
    "CREMA DE VERDURAS",
    "CREMA DE VERDURAS VERDES",
    "CREMA DE ZANAHORIA",
    "CREMA DE ZAPALLO",
    "CRIOLLA",
    "DE LA CASA CON POLLO",
    "DE POLLO CON OLLUCOS",
    "DE VERDURAS ORIENTAL",
    "DIETA DE POLLO",
    "FIDEOS CON POLLO",
    "FLORENTINA",
    "FUCHIFU DE POLLO",
    "GITANA",
    "JULIANA DE POLLO",
    "MENESTRON CRIOLLO MN",
    "MENESTRON ITALIANO",
    "MENESTRON ROJO",
    "PAC POW DE POLLO",
    "PATASCA",
    "POLLO CON VERDURAS",
    "RES CON VERDURAS",
    "SANCOCHADO",
    "SEMOLA CON CARNE",
    "SEMOLA CON POLLO",
    "SHAMBAR",
    "SOPA ANDINA",
    "SOPA CAMPESINA",
    "SOPA DE MOTE",
    "SOPA DE POLLO AL CURRY",
    "SOPA DE POLLO CON KION",
    "SOPA DE POLLO ORIENTAL",
    "SOPA DE QUINUA CON CARNE",
    "SOPA ESPANOLA",
    "SOPA WANTAN",
    "SUSTANCIA DE CARNE",
    "SUSTANCIA DE POLLO",
    "TRIGO CON CARNE",
    "TRIGO CON POLLO",
]

ERP_FRUTA = [
    "AGUAYMANTO 6 ONZ",
    "ARANDANOS 6 ONZ",
    "ENSALADA DE FRUTAS CHICA",
    "ENSALADA DE FRUTAS GRANDE",
    "ENSALADA DE FRUTAS REGULAR",
    "FRESA 1/4 LITRO",
    "FRESA 6 ONZ",
    "MANDARINA SN",
    "MANZANA CHILENA ROJA SN",
    "MANZANA CHILENA VERDE SN",
    "MANZANA ISRAEL SN",
    "PAPAYA PICADA 1/2 LITRO",
    "PAPAYA PICADA 1/4 LITRO",
    "PERA DE AGUA SN",
    "PINA GOLDEN PICADA 1/2 LITRO",
    "PINA GOLDEN PICADA 1/4 LITRO",
    "PLATANO DE ISLA SN",
    "PLATANO DE SEDA SN",
    "SANDIA PICADA 1/2 LITRO",
    "SANDIA PICADA 1/4 LITRO",
    "TUNA PICADA 6 ONZ",
    "UVA VERDE 1/2 LITRO",
    "UVA VERDE 1/4 LITRO",
    "PARFAIT VASO 12 ONZA",
    "CHUPETE DE FRUTA CON LECHE",
]

ERP_CHAUFA = [
    "CHAUFA CON LOMO SALTADO",
    "CHAUFA DE CARNE",
    "CHAUFA DE CARNE - CHICO",
    "CHAUFA DE MARISCOS",
    "CHAUFA DE PESCADO",
    "CHAUFA DE POLLO",
    "CHAUFA DE POLLO - CHICO",
    "CHAUFA AMAZONICO + BEBIDA",
]

ERP_SNACKS_SALUDABLES = [
    "CHOCLO SANCOCHADO",
    "HUEVOS DUROS X2",
    "PAPITA ARREBOZADA CON HUEVO",
    "PASAS MORENAS SN",
    "PASAS RUBIAS SN",
    "PARFAIT CON CHIA 12 ONZ",
    "GELATINA 12 ONZ",
    "PARFAIT FRUTADO 12 ONZ",
]

ERP_ENSALADAS_REGULAR = [
    "ENSALADA CLASIQUERA",
    "ENSALADA COCIDA",
    "ENSALADA DELICIA",
    "ENSALADA GRIEGA",
    "ENSALADA MEXICANA",
    "ENSALADA NICOISE",
    "ENSALADA PERUANA",
    "ENSALADA POPEYE",
    "ENSALADA PRIMAVERA",
    "ENSALADA VERANIEGA",
    "ENSALADA VICTORIA",
    "ENSALADA MEDITERRANEA",
    "ENSALADA MIL GARBANZOS",
    "ENSALADA PASTA CAPRESSE",
    "ENSALADA CHOCLONA",
    "ENSALADA ORIENTAL CON CERDO HOMEADO",
    "ENSALADA LA RAYADA CON ATUN",
    "ENSALADA AMERICANA CON PECHUGA A LA PLAN",
    "ENSALADA JARDINERA DE FIDEOS CON MILANES",
    "ENSALADA ARCOIRIS C/PECHUGA A LA PLANCHA",
    "ENSALADA DEL HUERTO CON ATUN",
    "ENSALADA LA IQUINA CON POLLO CRISPY",
    "ENSALADA LA SOLTERA CON RES MECHADO",
    "ENSALADA LA SOLTERA CON MILANESA DE POLL",
    "ENSALADA JARDINERA DE FIDEOS POLLO CRISP",
    "ENSALADA ARCOIRIS CON CERDO CRIOLLO",
    "ENSALADA DIVERTIDA CON POLLO HORNEADO",
    "ENSALADA LA LENTEJA CON RES MECHADA",
    "ENSALADA AMERICANA CON POLLO DESHILACHA",
    "ENSALADA LA RAYADA CON PECHUGA CROCANTE",
    "ENSALADA AMERICANA CON POLLO TIPO BRASA",
    "ENSALADA ESPINACA PARMESANA CON ATUN",
    "ENSALADA ARCOIRIS CON POLLO HORNEADO",
    "ENSALADA JARDINERA DE FIDEOS CON ATUN",
    "ENSALADA TABULE CON RES MECHADA",
    "ENSALADA ORIENTAL CON POLLO HORNEADO",
    "ENSALADA MI CAMOTE CON POLLO HORNEADO",
    "ENSALADA DEL HUERTO PECHUGA BISTECK",
]

ERP_BOCADITOS_DULCES = [
    "ALFAJOR CHICO",
    "ALFAJOR CORAZON X 8 UNID",
    "ALFAJOR DE CHOCOLATE",
    "ALFAJOR DE MAICENA",
    "ALFAJOR DE MAICENA CHICO",
    "ALFAJORES 95 GR EL CHAPO",
    "BLONDIE CON CHOCOCHIPS",
    "BROWNIE CON CASTANAS",
    "BROWNIE CON COOKIES AND C",
    "BROWNIE LIGHT",
    "BROWNIE TRUFADO",
    "MILHOJAS",
    "MILHOJAS DE FRESA",
    "MUSS DE MARACUYA",
    "PIONONO",
    "RELAMPAGO DE CHOCOLATE",
    "STRUDEL DE MANZANA",
    "TIRAMISU",
    "ARBOL NAVIDENO DE ALFAJOR",
]

ERP_HELADOS = [
    "HELADOS VASITOS 110 GR",
    "BARQUIMIEL CONO DE HELADO",
    "MARCIANO DE FRUTA",
    "BOMBONES DONOFRIO",
    "FRIO RICO VAINILLA",
    "FRIO RICO FRESA",
    "DONOFRIO JET",
    "SIN PARAR HELADO LUCUMA",
    "FRIO RICO CAPPUCCINO",
    "COPA K-BANA HELADO",
    "DONITO HELADO",
    "SUBLIME HELADO PAT GALLET",
    "SANDWICH HELADO VAINILLA",
    "HELADO MINI SUBLIME",
    "HELADO ARTESANAL 1 BOLA",
    "HELADO ARTESANAL 2 BOLA",
    "HELADO ARTESANAL 3 BOLAS",
    "HELADOS GUAPOPS 95 ML",
    "HELADO ARTESANAL EN CONO",
    "HELADO CHEESECAKE DE SAUC",
    "HELADO CHOCOLATE BLANCO C",
    "HELADO CHOCOLATE CON ALME",
    "HELADO COCADA CON MANJAR",
    "HELADO COOKIES & CREAM 13",
    "HELADO FRESA CON LECHE CO",
    "HELADO LUCUMA CON CHOCOLA",
    "HELADO MANGO CON CREMA DE",
    "HELADO MENTA CON CHOCOLAT",
    "HELADO PIE DE LIMON 130G",
    "HELADOS CHILLPOPS 95 GR",
    "HELADOS PALETAS RELLENOS",
    "PALETA ARTESANAL DELI",
    "GUAPOPS UVA FRESH 86ML",
    "GUAPOPS FRESA CHILL 86 ML",
    "GUAPOPS GUANABANA COOL 86",
    "GUAPOPS PINA MENTA POWER",
    "GUAPOPS SUPER MANGOCUYA 8",
    "HELADO PALETTI JUMBO",
    "HELADO PR-FIT PALETAS",
    "HELADO YAMBOLY CONOBOLA",
    "HELADO YAMBOLY CORNELLO/B",
    "HELADO YAMBOLY MAGNETO",
    "HELADO YAMBOLY MEDIANO (C",
    "HELADO YAMBOLY PEQUENO (P",
    "MACARRONS CHRISTMAS",
    "MACARRONS CHRISTMAS X 4 U",
    "CHOCO COPITO",
]

ERP_POSTRES_VARIOS = [
    "LECHE ASADA",
    "ALFAJOR DE HOJALRE",
    "CREMOSITO DE LIMON",
    "PICARAS NUTRITIVAS X 3",
    "ALFAJOR DE AVENA CUBIERTO CON CHOCOLATE",
    "ALGODON EN VASO",
    "MANZANA ACARAMELADA",
    "WAFLES CON FRUTOS",
    "BLOODY MARY",
    "BROWNIES CHICOS",
    "COCADITAS SABRINA",
    "VASITO DE GELATINA CON TO",
    "VASO MANGO CON CREMA DE M",
    "MILHOJAS DE MANJAR",
    "ALFAJOR DE MAICENA CON AZ",
    "DONNUTS RELLENAS",
    "DONNUTS SIMPLE",
    "DONAS",
    "CASA NAVIDENA MEDIANA",
    "CASA NAVIDENA GRANDE",
    "CASA NAVIDENA ARMADA",
    "CUPCAKE NAVIDENO",
]

ERP_TORTAS = [
    "TORTA DE CHOCOLATE PORCION",
    "TORTA DE ZANAHORIA",
    "TORTA ECONOMICA CHOCO FRESA #20",
    "TORTA ECONOMICA DE MANJAR #20",
    "TORTA RED QUESO",
    "TORTA VAINILLA MANJAR PORCION",
    "TRES LECHES CHOCOLATE PORCION",
    "TRES LECHES VAINILLA PORCION",
    "TORTA DE CHOCOLATE ENTERA GRANDE",
    "TORTA 3 LECHES ENTERA",
    "TORTA SELVA NEGRA",
    "TORTA MOCA",
    "TORTA SUBLIME",
    "5 LECHES DE VAINILLA",
    "5 LECHES DE CHOCOLATE",
    "TORTA HELADA",
    "PACK DIA MADRE",
    "PECADO DE LUCUMA PORCION",
    "CARA DE SANTA TORTA",
    "ARBOL NAVIDENO TORTA",
]

ERP_KEKES = [
    "CHIFON DE NARANJA",
    "CHIFON DE VAINILLA",
    "KEKE DE CHOCOLATE",
    "KEKE DE NARANJA",
    "KEKE DE PLATANO",
    "KEKE DE VAINILLA",
    "KEKE DE VAINILLA C/CHOCOCHIP",
    "KEKE DE ZANAHORIA CON PASAS",
    "KEKE MARMOLEADOR",
    "KEKE DE PINA",
    "KEKE DE PLATANO MN",
    "KEKE DE PLATANO PORCION",
    "KEKE DE VAINILLA PORCION",
    "KEKE TERRINA CON CHISPAS",
    "KEKE TERRINA VAINILLA",
    "KEKE TERRINA ZANAHORIA",
    "KEKE DE ZANAHORIA",
    "KEKE RECTANGULAR DE ZANA",
    "KEKE RECTANGULAR DE VAINI",
    "KEKE DE HIGO",
    "CARROT CAKE",
    "CHIFON DE CHOCOLATE",
    "CHIFON MARMOLEADO",
    "KEKE NAVIDENO",
    "MINI CARROT CAKE",
    "KEKE INGLES",
]

ERP_BOCADITOS_SALADOS = [
    "MINI TARTALETA CHOCLO",
    "ENROLLADO DE HOT DOG",
    "ENROLLADO DE LECHON",
    "ENROLLADO DE POLLO",
    "ENROLLADO DE POLLO A LA B",
    "ENROLLADO DE POLLO C/ BBQ",
    "ENROLLADO MIXTO",
    "ENROLLADO VEGETARIANO",
    "ENRROLLADO DE HOT DOG",
    "EMPANADA DE CARNE NORMAL",
    "EMPANADA DE LOMO",
    "EMPANADA DE POLLO NORMAL",
    "EMPANADA MIXTA NORMAL",
    "EMPANADITAS DE CARNE",
    "EMPANADITAS DE POLLO",
    "TAMALITOS",
    "MINI PIZZA",
    "MINI EMPANADA MIXTA",
]

ERP_CHEESSECAKE_Y_OTROS = [
    "CHESSECAKE FRESA PORCION",
    "CHESSECAKE MARACUYA PORCION",
    "CHESSECAKE SAUCO PORCION",
    "COPITA CHEESECAKE FRESA",
    "COPITA CHEESECAKE MARACUYA",
    "COPITA CHEESECAKE SAUCO",
    "COPITA MOUSSE MARACUYA",
    "CREMA VOLTEADA PORCION",
    "MINI ALFAJOR",
    "MINI BROWNIE AMERICANO",
    "MINI PANUELOS",
    "MINI TARTALETA DE DURAZNO",
    "MINI TRUFAS",
    "MOUSSE DE CHOCOLATE PORCION",
    "PIE DE LIMON PORCION",
    "PIE DE MARACUYA PORCION",
    "TARTALETA DE FRESA T/P",
    "MOLDE DE CREMA VOLTEADA",
    "FRESA BANADA CON CHOCOLATE",
    "SUSPIRO A LA LIMENA",
    "MINI BORRACHITO",
    "MOUSSE DE MARACUYA PORCION",
    "MOUSSE DE FRESA PORCION",
    "PIE DE PINA",
    "COPA PROFITEROLES",
    "COPA MOUSSE DE FRESA",
    "COPA MOUSSE DE MARACUYA",
    "TRUFA DE CHOCOLATE",
    "MINI SANDWICH HELADO VAINILLA",
    "ALASKA HELADO FRESA 70ML",
    "PIE DE MANZANA PORCION",
    "CHEESECAKE DE OREO",
    "CHEESECAKE DE FRUTOS DEL",
    "CHEESECAKE DE MARACUMANGO",
    "CHEESECAKE DE NUTELLA",
    "CHEESSECAKE DE MARACUYA",
    "CHEESSECAKE DE DURAZNO",
    "CHEESSECAKE DE SAUCO",
    "TARTALETA DE FRUTOS ROJOS",
    "TARTALETA DE FRESA C/CHAN",
    "TARTALETA DE MANZANA",
    "TARTALETA DE MARACUYA",
    "TARTALETA DE CHOCOLATE",
    "COPA NAKED",
    "COPA RED VELVET",
    "CUCHAREABLE CAPPUCCINO",
    "CUCHAREABLE CHEESECAKE DE",
    "CUCHAREABLE CHOCOLATE CON",
    "CUCHAREABLE COOKIES AND C",
    "CUCHAREABLE LUCUMA CON BR",
    "CUCHAREABLE PIE DE LIMON",
    "CUCHAREABLE VAINILLA CON",
    "CROCANTE DE MANZANA",
    "CROCANTE DE PINA",
    "CRUMBLE DE MANZANA",
    "CUCHAREABLE DE MILHOJAS",
    "CUCHAREABLE DE BROWNIE",
    "CUCHAREABLE DE CHOCOLUCUMA",
    "CUCHAREABLE DE ALFAJOR",
    "CUCHAREABLE DE CHOCOLATE",
    "CUCHAREABLE DE PROFITEROLES",
    "CUCHAREABLE DE CARROT CAKE",
    "CUCHAREABLE DE TRES LECHES VAINILLA",
    "CUCHAREABLE DE TRES LECHES CHOCOLATE",
    "CUCHAREABLE TIRAMISU",
    "CUCHAREABLE CHOCOLATOSO",
    "CUCHAREABLE OREO",
    "MINI PIE DE LIMON",
    "PASTEL DE MANZANA PORCION",
    "CUCHAREABLE TERREMOTO",
    "CUCHAREABLE DE PISTACHOS",
]

ERP_SNACK = [
    "BARRITAS MANI",
    "CRISSINO DE HUANCAINA",
    "CRISSINO DE OREGANO",
    "CRISSINOS DE ACEITUNA",
    "CRISSINOS NATURALES",
    "ROSQUITAS",
    "ROSQUITAS DE ANIS",
    "ROSQUITAS SURTIDAS",
    "INKA CHIPS SAL DE MAR",
    "CRISSINOS DE AJONJOLI",
    "CRISSINOS INTEGRALES",
    "PRINGLES 37 GR",
    "PRINGLES 104 GR",
    "BARRA CEREAL CAFE MACA AG",
    "BARRA CEREAL CON HIGOS",
    "BARRA DE CEREAL",
    "BARRITAS DE GRANOLA",
    "MIX FRUTOS SECOS 140 G",
    "MIX FRUTOS SECOS 60 G SAB",
    "PITA CHIPS DE AJOS Y OREG",
    "PITA CHIPS INTEGRAL DE AJ",
    "PITUCA CHIPS 146G",
    "MAKIS VARIADOS",
    "ALMENDRAS SN",
    "ARVERJA VERDE SN",
    "CANCHITA SERRANA SN",
    "CASHEWS SN",
    "GARBANZOS SN",
    "HABAS SN",
    "KARINTO SN",
    "MANI CON PASAS SN",
    "MANI CONFITADO SN",
    "MANI DULCE Y SALADO SN",
    "MANI SN",
    "MOTE FRITO SN",
    "NUECES SN",
    "PECANAS SN",
    "POP CORN CHICO",
    "BOCADITO DULCE",
    "BOCADITO SALADO",
    "BOCADITO GOURMET DULCE",
    "BOCADITO GOURMET SALADO",
    "CANCHITA FRITA SERRANA",
    "FRUTOS SECOS CAJU",
    "FRUTO SECO PISTACHO",
    "FRUTO SECO NUEZ",
    "DESCARTABLE PARA LLEVAR",
    "CUBIERTOS DESCARTABLES",
    "CRISSINO AL AJO",
    "CHIPS AHOY",
    "GRANOLA",
    "CHIFLES SALADOS",
    "GRANUTS NUECES",
    "MAKIS",
    "TORTEES",
    "GALLETA SALVADO PARMESANO NANCY NATUR 62",
    "GALLETA SALVADO ROMERO NANCY NATUR 62 G",
    "GALLETA AVENA Y CASTANA X 5 NANCY NATUR",
    "PALITOS LINAZA Y SALVADO NANCY NATUR 55",
    "PALITOS AJONJOLI NANCY NATUR 55 G",
    "PALITOS YUCA QUESO NANCY NATUR 50 G",
    "PALITOS YUCA OREGANO NANCY NATUR 50 G",
    "PALITOS YUCA AJONJOLI NANCY NATUR 50 G",
    "BARRA FIT",
    "TAKIS",
    "CRISSINOS IMAIA VARIADOS",
    "QUIPYS QUESO/LIMON PICANTE",
]

ERP_GALLETAS = [
    "GALETA SODA V",
    "GALLETA CASINO ALFAJOR",
    "GALLETA CASINO FRESA",
    "GALLETA CASINO MENTA",
    "GALLETA CASINO VAINILLA",
    "GALLETA CHARADA",
    "GALLETA CHOCO",
    "GALLETA CHOCO DONUT",
    "GALLETA CHOCOLATE LENTEJAS",
    "GALLETA CHOKIS CHISPAS DE CHOCOLA",
    "GALLETA CHOKOSODA",
    "GALLETA CHOMP CHOCOLATE",
    "GALLETA CHOMP NARANJA",
    "GALLETA CLUB SOCIAL",
    "GALLETA CORONITA",
    "GALLETA DE AVENA",
    "GALLETA DE CHIA",
    "GALLETA DE MULTIGRANOS",
    "GALLETA DE SALVADO",
    "GALLETA FRAC",
    "GALLETA GALCITAS FRESA",
    "GALLETA GLACITAS CHOCONIEVE",
    "GALLETA INTEGRAKERS",
    "GALLETA INTEGRALES",
    "GALLETA MARGARITA",
    "GALLETA MARQUESITA COCO",
    "GALLETA MARQUESITA NARANJA",
    "GALLETA MOROCHAS",
    "GALLETA OREO CHOCOLATE",
    "GALLETA OREO DOBLE VAINILLA",
    "GALLETA PICARA EXTREMA CHOCOLATE",
    "GALLETA PICARA XL",
    "GALLETA PICARAS CLASICA",
    "GALLETA RELLENITA CHOCOLATE",
    "GALLETA RELLENITA MENTA",
    "GALLETA RELLENITAS VAINILLA",
    "GALLETA RITZ",
    "GALLETA SODA SAN JORGE",
    "GALLETA SODA FIELD",
    "GALLETA SODA LINE",
    "GALLETA TENTACION",
    "GALLETA VAINILLA",
    "GALLETAS LAMINADOS",
    "GALLETAS PALITOS",
    "GALLETAS REDONDAS",
    "GALLETA RITZ CON QUESO",
    "GALLETA CASINO CHOCOLATE",
    "WINTER WAFER",
    "EMPANADITAS DE CANELA",
    "OREO TACO",
    "RELLENITA TACO",
    "GALLETA CON AVENA 100 GR",
    "GALLETA CON KIWICHA 100 G",
    "GALLETA CON QUINUA 100 GR",
    "GALLETA CON SOYA 100 GR",
    "GALLETA CON YOGURT 100 GR",
    "GALLETAS AVENA MIEL SABRI",
    "GALLETAS CHOCOCHIPS SABRI",
    "GALLETAS MACA Y CANELA SA",
    "GALLETAS QUINUA Y ALGARRO",
    "GALLETAS DULCES",
    "GALLETAS SURTIDAS",
    "GALLETA DE CHOCOCHIP GRAN",
    "COOKIES DE AVENA CON CHOC",
    "COOKIES DE CHOCO CHIPS CO",
    "COOKIES DE CHOCOLATE CON",
    "COOKIES DE CHOCOM CHIPS C",
    "MINI CHIPS AHOY",
    "MINI MOROCHAS",
    "MINI OREO",
    "MINI QUICHE TOCINO",
    "MINI PICARAS CLASICAS 50G",
    "MUFFIN NAVIDEÑO X 4UND",
    "MUFFINS",
    "PICARAS NUTRITIVAS X 6",
    "GALLETA KIWICHA AMAIA",
    "GALLETAS DE MACA CON COCO AMAIA",
    "GALLETAS DE MACA CON FRESA AMAIA",
    "CORONITA CHOCOLATE",
    "GALLETA DE QUINUA CON CHISPAS DE CHOCOLA",
    "GALLETA DE QUINUA CON FRUTOS ROJOS",
    "GALLETA DE QUINUA CON COCO",
    "CORONITA CHOCOLATE TACO",
    "GALLETA CHOCO BOOM",
]

ERP_YOGURT_BEBIBLE = [
    "YOFRESH FRESA 320 GR",
    "GLORIA BEB. CHICHA MORADA",
    "GLORIA BEB. DURAZNO 200ML",
    "YOLEICITO YOGURT",
    "YOGURT YOPI MIX",
    "YOGURT FRUTADO PINA",
    "YOGURT FRUTADO ARANDANO",
    "YOMOST",
    "YOGURT FRESA 180 GR",
    "YOGURT VAINILLA 180GR",
]

ERP_JUGOS_Y_OTROS = [
    "PULP BOTELLA 350 ML",
    "CHOCOLATADA CAJITA",
    "CIFRUT DE NARANJA 400",
    "CIFRUT DE GRANADILLA 400",
    "PULP 315 ML CAJA",
    "TAMPICO CITRUS 500 ML",
    "TAMPICO CITRUS PUNCH 600",
    "SHAKE MOCACCINO",
    "SHAKE CHOCOMIX",
    "SHAKE CAPUCCINO",
    "EPIC NARANJA 380ML",
    "EPIC NARANJA 250ML",
    "EPIC ARANDANO-PINA 250ML",
    "EPIC ARANDANO-PINA 380ML",
    "EPIC MANGO-MARACUYA 250ML",
    "EPIC MANGO-MARACUYA 380ML",
    "EPIC NARANJA 2L",
    "KERO ALOE UVA",
    "CHICHA MORADA NATURALE 50",
    "BEBIDA CHOCOLAC",
    "SHAKE COOKIS",
    "PRO DAY UHT VAINILLA 320 ML GLORIA",
    "PRO DAY UHT CHOCOLATE 320 ML GLORIA",
]

ERP_FRUGOS = [
    "FRUGOS DURAZNO CAJA 235 ML",
    "FRUGOS DURAZNO VIDRIOS 286 ML",
    "FRUGOS WATTS 350ML",
    "FRUGOS DEL VALLE 500 ML",
]

ERP_AGUAS = [
    "AGUA CIELO ALCALINA 625 ML",
    "AGUA CIELO C/GAS 625 ML",
    "AGUA CIELO S/GAS 625 ML",
    "AGUA CIELO S/GAS 1 L",
    "AGUA SAN LUIS C/GAS 625 ML",
    "AGUA SAN LUIS S/GAS 625 ML",
    "AGUA SAN LUIS SPORT 1 L",
    "AGUA SAN CARLOS 500 ML",
    "AGUA SAN MATEO 600ML",
    "AGUA SAN CARLOS 750 ML",
    "AGUA SAN LUIS S/GAS 750 ML",
    "AGUA SOCOSANI C/GAS 500 ML",
    "AGUA SOCOSANI FONTEVITA S/GAS 600",
    "AGUA SAN MATEO S/GAS 500ML",
]

ERP_AGUAS_SABORIZADAS = [
    "AQUARIUS MANZANA 600 ML",
    "AQUARIUS NARANJA 600 ML",
    "AQUARIUS PERA 600ML",
    "BIO ARANDANO VIDRIO 300 ML",
    "BIO CAMU CAMU VIDRIO 300 ML",
    "BIO UVA VIDRIO 450 ML",
    "FREE TEA FRUTOS ROJOS PET 500 ML",
    "FREE TEA LIMON PET 500 ML",
    "FREE TEA NEGRO DURAZNO PET 500 ML",
    "FREE TEA NEGRO LIMON PET 500 ML",
    "FREEA TEA LIGHT LIMON VIDRIO 450 ML",
    "LEAF TEA 500 ML",
    "BIO AGUAJE",
    "BIO CAMU CAMU",
    "BIO ALOE UVA 500 ML",
    "AGUA SAN LUIS SABOR MANZANA",
    "AGUA SAN LUIS SABOR MARACUYA",
    "AGUA SAN LUIS SABOR PINA",
    "AGUA SAN LUIS SABOR LIMON",
    "FRUTARIS 500 ML",
    "LEAF TEA LIMON",
    "AGUA CIELO SABOR LIMON 600ML",
    "AGUA CIELO SABOR MARACUYA 600 ML",
    "AGUA CIELO SABOR MANZANA 600 ML",
    "AGUA SOCOSANI FRUTOS ROJOS 500 ML",
    "AGUA SOCOSANI LIMON 500 ML",
    "BIO AGUAYMANTO VIDRIO 300 ML",
]

ERP_ENERGIZANTES = [
    "ENERGIZANTE MONSTER",
    "H2O",
    "VOLT 450 ML",
    "RED BULL",
    "VOLT BLUE PET 300 ML",
    "VOLT FANTASY PET 300 ML",
    "VOLT RAINBOW PET 300 ML",
    "VOLT UVA PET 300 ML",
    "220 ENERGIZANTE",
]

ERP_GASEOSAS = [
    "COCA COLA 1.5 L",
    "COCA COLA 3 L",
    "COCA COLA 500 ML",
    "COCA COLA ZERO 500 ML",
    "CRUSH 3L",
    "FANTA KOLA INGLESA 500 ML",
    "FANTA NARANJA 500 ML",
    "INCA KOLA 1.5 L",
    "INCA KOLA 3L",
    "INCA KOLA 500 ML",
    "INCA KOLA ZERO 1.5 L",
    "INCA KOLA ZERO 500 ML",
    "SPRITE 400 ML",
    "SPRITE ZERO 400 ML",
    "COCA COLA ZERO 300 ML",
    "BOLSA DE HIELO",
    "EVERVESS 1.5LT",
    "7UP X355ML",
    "7UP 355 ML",
    "CONCORDIA 355 ML",
    "PEPSI 355 ML",
    "PEPSI COLA 500ML",
    "GUARANA 450ML",
    "PEPSI COLA 450ML",
    "7UP 1.5L",
    "PEPSI 1.5L",
    "COCA COLA MINI 300 ML",
    "INCA KOLA MINI 300 ML",
    "PEPSI 2 LT",
    "HEY FIT GOLDEN FIZZ 600 ML",
    "HEY FIT SUMMER BREEZE 600 ML",
    "HEY FIT TANGO TWIST BOTELLA 600 ML",
    "HEY FIT GOLDEN FIZZ LATA 355 ML",
    "HEY FIT SUMMER BREEZE LATA 355 ML",
    "HEY FIT TANGO TWIST LATA 355 ML",
]

ERP_EMPRESAS = [
    "MENU BALANCEADO",
    "MENU ECONOMICO",
    "MENU EJECUTIVO",
    "MENU EJECUTIVO 2",
    "MENU EJECUTIVO 1 BASICO",
    "MENU EJECUTIVO 2 BASICO",
    "MENU EJECUTIVO 1 SIN POSTRE",
    "MENU EJECUTIVO 2 SIN POSTRE",
    "MENU - CENTRO DE VACUNACION",
    "ENSALADAS-VARIOS",
    "SNACKS ENVASADOS",
    "FRUTAS ENVASADAS",
    "DESAYUNO VARIOS",
    "SNACK CENTRO DE VACUNACION",
    "CENA - CENTRO DE VACUNACION",
    "MENU SEGUNDO SOLO",
    "MENU COMPLETO CALLAO",
    "SEGUNDO SOLO",
    "SEGUNDO CON POSTRE",
    "ENTRADA SOLA",
    "SOLO POSTRE",
    "PRESA EXTRA",
    "ALMUERZO COMPLETO COPSA",
    "ALMUERZO CON POSTRE O ENTRADA COPSA",
    "ALMUERZO SEGUNDO SOLO COPSA",
    "CENA COMPLETO COPSA",
    "CENA CON POSTRE O ENTRADA COPSA",
]

ERP_BEBIDAS_CALIENTES = [
    "ANIS FILTRANTE",
    "AVENA CON DURAZNO 12 OZ",
    "AVENA CON DURAZNO 16 OZ",
    "AVENA CON DURAZNO 8 OZ",
    "AVENA CON LECHE 12 OZ",
    "AVENA CON LECHE 16 OZ",
    "AVENA CON LECHE 8 OZ",
    "BOLDO FILTRANTE",
    "CAFE PASADO 12 OZ",
    "CAFE AMERICANO",
    "CAFE CON LECHE",
    "CAPUCCINO",
    "CHOCOLATE CALIENTE 12 OZ",
    "EXPRESO",
    "HIERBA LUISA FILTRANTE",
    "MANZANILLA FILTRANTE",
    "TE CANELA Y CLAVO FILTRANTE",
    "TE FILTRANTE",
    "CAFE MOCACCINO",
    "TERMO DE CAFE",
]


def norm(s: str) -> str:
    s = s.upper().strip().replace("**", "")
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    s = re.sub(r"\s+", " ", s)
    return s.replace(" 8OZ", " 8 OZ").replace(" 12OZ", " 12 OZ").replace(" 16OZ", " 16 OZ").replace("CAFÉ", "CAFE")


def load_paloteo() -> dict[str, tuple[str, float]]:
    wb = xlrd.open_workbook(str(XLS))
    sh = wb.sheet_by_index(0)
    by_code: dict[str, tuple[str, float]] = {}
    for r in range(6, sh.nrows):
        cod = str(sh.cell_value(r, 2)).strip()
        if not cod or cod == "Total:":
            continue
        prod = str(sh.cell_value(r, 3)).strip()
        if not prod:
            continue
        raw_price = sh.cell_value(r, 4)
        price = float(raw_price) if raw_price != "" else 0.0
        tienda = str(sh.cell_value(r, 1)).strip()
        if tienda == "Total:":
            continue
        if cod not in by_code:
            by_code[cod] = (prod, price)
    return by_code


def load_group_assignments() -> dict[str, str]:
    """Lee scripts/*.codes.txt → { codigo: nombreGrupo }."""
    code_to_group: dict[str, str] = {}
    for path in sorted(ASSIGNMENTS_DIR.glob("*.codes.txt")):
        group_name: str | None = None
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            if line.startswith("#"):
                m = re.search(r"Grupo:\s*([^—#\n]+)", line, re.I)
                if m:
                    group_name = m.group(1).strip()
                continue
            if group_name is None:
                raise SystemExit(f"Falta «# Grupo: …» en {path.name}")
            if line in code_to_group and code_to_group[line] != group_name:
                raise SystemExit(f"Código {line} duplicado en grupos distintos")
            code_to_group[line] = group_name
    return code_to_group


def ts_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'")


def active_groups(code_to_group: dict[str, str]) -> list[str]:
    used = set(code_to_group.values())
    return [g for g in PRODUCT_GROUPS if g in used]


def write_catalog(
    products: dict[str, tuple[str, float]],
    code_to_group: dict[str, str],
) -> None:
    lines = [
        "// Generado por: npm run catalog:gen — catálogo final (solo productos con grupo).",
        "export type Product = {",
        "  code: string;",
        "  description: string;",
        "  price: number;",
        "  group: string;",
        "};",
        "",
        "export const productCatalog: Record<string, Product> = {",
    ]
    for cod in sorted(code_to_group.keys(), key=lambda c: (products[c][0].lower(), c)):
        desc, price = products[cod]
        group = code_to_group[cod]
        entry = (
            f"  '{ts_escape(cod)}': {{ code: '{ts_escape(cod)}', "
            f"description: '{ts_escape(desc)}', price: {price:.2f}, "
            f"group: '{ts_escape(group)}' }},"
        )
        lines.append(entry)
    lines.extend(
        [
            "};",
            "",
            "export function lookupProduct(code: string): Product | null {",
            "  return productCatalog[code] ?? null;",
            "}",
            "",
            "export function productsByGroup(group: string): Product[] {",
            "  return Object.values(productCatalog).filter((p) => p.group === group);",
            "}",
            "",
        ]
    )
    OUT.write_text("\n".join(lines), encoding="utf-8")


def write_groups(groups: list[str]) -> None:
    items = ",\n  ".join(f'"{g}"' for g in groups)
    GROUPS_OUT.write_text(
        "\n".join(
            [
                "// Grupos de catálogo (asignación manual por capturas — no auto-clasificar).",
                "export const PRODUCT_GROUPS = [",
                f"  {items},",
                "] as const;",
                "",
                "export type ProductGroup = (typeof PRODUCT_GROUPS)[number];",
                "",
            ]
        ),
        encoding="utf-8",
    )


def write_group_report(
    group_name: str,
    erp_names: list[str],
    products: dict[str, tuple[str, float]],
    code_to_group: dict[str, str],
    aliases: dict[str, str],
) -> None:
    group_codes = {c for c, g in code_to_group.items() if g == group_name}
    pal_norm = {norm(p): (c, p) for c, (p, _) in products.items()}

    assigned: list[str] = []
    missing: list[str] = []
    for name in erp_names:
        key = norm(aliases.get(name, name))
        hit = pal_norm.get(key)
        if not hit:
            for pk, v in pal_norm.items():
                if pk == key or (len(key) > 14 and key.split(" 12")[0].split(" 16")[0].split(" 8")[0] in pk):
                    hit = v
                    break
        if hit and hit[0] in group_codes:
            assigned.append(f"- **{name}** → `{hit[0]}` ({hit[1]})")
        elif hit:
            assigned.append(f"- **{name}** → en paloteo `{hit[0]}` ({hit[1]}) — **sin grupo**")
        else:
            missing.append(f"- {name}")

    slug = group_name.lower().replace(" ", "-").replace("í", "i").replace("á", "a").replace("é", "e")
    path = DOCS_DIR / f"{slug}-pendientes.md"
    body = [
        f"# {group_name} — estado del catálogo",
        "",
        f"Códigos con grupo asignado: **{len(group_codes)}**",
        "",
        "## En paloteo con grupo",
        "",
        *sorted(
            f"- `{c}` — {products[c][0]}"
            for c in group_codes
            if c in products
        ),
        "",
        "## Capturas ERP emparejadas",
        "",
        *assigned,
        "",
        "## En capturas ERP pero NO en paloteo.xls",
        "",
        *missing,
        "",
    ]
    path.write_text("\n".join(body), encoding="utf-8")
    print(f"OK: reporte → {path}")


def write_productos_catalogo(
    products: dict[str, tuple[str, float]],
    code_to_group: dict[str, str],
    groups: list[str],
) -> None:
    """Catálogo final — fuente legible / Excel para la app."""
    by_group: dict[str, list[tuple[str, str, float]]] = {g: [] for g in groups}
    for cod, group in code_to_group.items():
        desc, price = products[cod]
        by_group[group].append((cod, desc, price))
    for g in groups:
        by_group[g].sort(key=lambda x: x[1].lower())

    csv_path = DOCS_DIR / "productos-catalogo.csv"
    csv_lines = ["Codigo,Producto,Precio,Grupo"]
    for g in groups:
        for cod, desc, price in by_group[g]:
            safe_desc = desc.replace('"', '""')
            csv_lines.append(f'"{cod}","{safe_desc}",{price:.2f},"{g}"')
    csv_path.write_text("\n".join(csv_lines) + "\n", encoding="utf-8")
    print(f"OK: catálogo CSV → {csv_path}")

    md_path = DOCS_DIR / "productos-catalogo.md"
    body = [
        "# Catálogo de productos",
        "",
        f"Total: **{len(code_to_group)}** productos en **{len(groups)}** grupos.",
        "",
        "Fuente para la app: `src/data/productCatalog.ts` (generado con `npm run catalog:gen`).",
        "Vista Excel: `docs/productos-catalogo.csv`.",
        "",
        "## Resumen",
        "",
        "| Grupo | Productos |",
        "|-------|----------:|",
        *[
            f"| {g} | {len(by_group[g])} |"
            for g in groups
        ],
        "",
    ]
    for g in groups:
        body.extend(
            [
                f"## {g}",
                "",
                "| Código | Producto | Precio |",
                "|--------|----------|--------|",
                *[
                    f"| `{cod}` | {desc} | {price:.2f} |"
                    for cod, desc, price in by_group[g]
                ],
                "",
            ]
        )
    md_path.write_text("\n".join(body), encoding="utf-8")
    print(f"OK: catálogo MD → {md_path}")


def main() -> None:
    products = load_paloteo()
    code_to_group = load_group_assignments()
    unknown = set(code_to_group.keys()) - set(products.keys())
    if unknown:
        raise SystemExit(f"Códigos no encontrados en paloteo: {', '.join(sorted(unknown))}")

    groups = active_groups(code_to_group)

    write_catalog(products, code_to_group)
    write_groups(groups)

    frias_aliases = {
        "CHICHA MORADA 12 OZ": "CHICHA MORADA 16 OZ",
        "JUGO DE FRESA 12 OZ": "JUGO DE FRESA 16 OZ",
        "JUGO DE MANGO 12 OZ": "JUGO DE MANGO 16OZ",
        "JUGO DE MANGO CON LECHE 12 OZ": "JUGO DE MANGO CON LECHE 16OZ",
        "JUGO DE MANGO CON LECHE 16 OZ": "JUGO DE MANGO CON LECHE 16OZ",
        "JUGO DE PAPAYA CON PINA 12 OZ": "JUGO DE PAPAYA Y PINA 12OZ",
        "JUGO DE PAPAYA CON PINA 16 OZ": "JUGO DE PAPAYA Y PINA 12OZ",
        "JUGO SURTIDO ESPECIAL 12 OZ": "JUGO ESPECIAL 16 OZ",
        "JUGO SURTIDO ESPECIAL 16 OZ": "JUGO ESPECIAL 16 OZ",
        "REFRESCO DEL DIA": "REFRESCO DEL DIA",
    }
    calientes_aliases = {
        "CAFE AMERICANO": "CAFE AMERICANO 12 OZ",
        "CAPUCCINO": "CAFE CAPUCCINO 12 OZ",
        "CAFE CON LECHE": "CAFE CON LECHE 12 ONZ",
    }

    empresas_aliases = {
        "MENU EJECUTIVO": "MENU EJECUTIVO 1",
        "MENU EJECUTIVO 2": "MENU EJECUTIVO 1",
        "MENU EJECUTIVO 1 BASICO": "MENU EJECUTIVO 1",
        "MENU EJECUTIVO 2 BASICO": "MENU EJECUTIVO 1",
        "MENU EJECUTIVO 1 SIN POSTRE": "MENU EJECUTIVO 1 SIN POSTRE O ENTRADA",
        "MENU EJECUTIVO 2 SIN POSTRE": "MENU EJECUTIVO 1 SIN POSTRE O ENTRADA",
        "SOLO POSTRE": "POSTRE SOLO",
        "PRESA EXTRA": "PRESA ADICIONAL",
        "ALMUERZO SEGUNDO SOLO COPSA": "ALMUERZO SEGUNDO SOLO COPSA",
    }

    gaseosas_aliases = {
        "INCA KOLA 3L": "INCA KOLA 3L",
        "HEY FIT GOLDEN FIZZ LATA 355 ML": "HEY FIT GOLDEN FIZZ LATA 355 ML",
        "HEY FIT SUMMER BREEZE LATA 355 ML": "HEY FIT SUMMER BREEZE LATA 355 ML",
        "HEY FIT TANGO TWIST LATA 355 ML": "HEY FIT TANGO TWIST LATA 355 ML",
    }

    aguas_aliases = {
        "BIO CAMU CAMU VIDRIO 300 ML": "BIO CAMU CAMU",
        "BIO ALOE UVA 500 ML": "BIO ALOE UVA 500 ML",
        "AGUA SAN LUIS SABOR PINA": "AGUA SAN LUIS SABOR MARACUYA",
    }

    aguas_plain_aliases = {
        "AGUA CIELO C/GAS 625 ML": "AGUA CIELO C/GAS 626 ML",
        "AGUA SAN LUIS C/GAS 625 ML": "AGUA SAN LUIS C/GAS 626 ML",
        "AGUA SAN LUIS S/GAS 625 ML": "AGUA SAN LUIS S/GAS 626 ML",
        "AGUA SAN MATEO 600ML": "AGUA SAN MATEO S/GAS 500ML",
        "AGUA SAN MATEO S/GAS 500ML": "AGUA SAN MATEO S/GAS 500ML",
    }

    frugos_aliases = {
        "FRUGOS DURAZNO VIDRIOS 286 ML": "FRUGOS DURAZNO PLASTICO 300 ML",
        "FRUGOS WATTS 350ML": "FRUGOS DURAZNO PLASTICO 300 ML",
    }

    jugos_aliases = {
        "KERO ALOE UVA": "BIO ALOE UVA 500 ML",
    }

    bocaditos_dulces_aliases = {
        "BROWNIE CON COOKIES AND C": "BROWNIE CON COOKIES AND CREAM",
        "TIRAMISU": "CUCHAREABLE TIRAMISU",
    }

    helados_aliases = {
        "HELADO YAMBOLY PEQUENO (P": "HELADO YAMBOLY PEQUENO",
        "HELADO YAMBOLY MEDIANO (C": "HELADO YAMBOLY MEDIANO",
        "SANDWICH HELADO VAINILLA": "HELADO YAMBOLY MEDIANO",
    }

    postres_varios_aliases = {
        "MILHOJAS DE MANJAR": "MILHOJAS",
        "ALFAJOR DE MAICENA CON AZ": "ALFAJOR DE MAICENA",
        "VASITO DE GELATINA CON TO": "GELATINA 12 ONZ",
        "DONNUTS RELLENAS": "DONAS",
        "DONNUTS SIMPLE": "DONAS",
    }

    tortas_aliases = {
        "TORTA RED QUESO": "TORTA RED VELVET",
    }

    kekes_aliases = {
        "KEKE DE VAINILLA C/CHOCOCHIP": "KEKE DE CHOCOCHIP",
        "KEKE DE PLATANO": "KEKE DE PLATANO PORCION",
        "KEKE DE VAINILLA PORCION": "KEKE DE VAINILLA",
        "MINI CARROT CAKE": "CUCHAREABLE DE CARROT CAKE",
    }

    bocaditos_salados_aliases = {
        "ENROLLADO DE POLLO A LA B": "ENROLLADO DE POLLO A LA BRASA",
        "ENRROLLADO DE HOT DOG": "ENRROLLADO DE HOT DOG",
    }

    cheesecake_aliases = {
        "CHESSECAKE FRESA PORCION": "CHEESECAKE FRESA PORCION",
        "CHESSECAKE MARACUYA PORCION": "CHESSECake MARACUYA PORCION",
        "CHESSECAKE SAUCO PORCION": "CHEESSECake DE SAUCO",
        "MINI ALFAJOR": "ALFAJOR CHICO",
        "MINI TRUFAS": "TRUFA DE CHOCOLATE",
        "TARTALETA DE FRESA T/P": "TARTALETA DE FRESA",
        "TARTALETA DE FRESA C/CHAN": "TARTALETA DE FRESA C/CHANTILLY",
        "CHEESECAKE DE FRUTOS DEL": "CUCHAREABLE CHEESECAKE DE FRUTOS DEL BOSQUE",
        "CHEESSECAKE DE DURAZNO": "CUCHAREABLE CHEESECAKE DE DURAZNO",
        "CHEESSECAKE DE MARACUYA": "CHEESSECake DE MARACUYA",
        "CUCHAREABLE CHOCOLATE CON": "CUCHAREABLE CHOCOLATOSO",
        "CUCHAREABLE DE CHOCOLATE": "CUCHAREABLE CHOCOLATOSO",
        "CUCHAREABLE COOKIES AND C": "CUCHAREABLE COOKIES AND CREAM",
        "CUCHAREABLE OREO": "CHEESECAKE DE OREO",
        "MINI PIE DE LIMON": "CUCHAREABLE PIE DE LIMON",
        "PASTEL DE MANZANA PORCION": "PIE DE MANZANA PORCION",
        "COPA RED VELVET": "TORTA RED VELVET",
    }

    snack_aliases = {
        "MIX FRUTOS SECOS 60 G SAB": "MIX FRUTOS SECOS 60 G SABRINA",
        "PITA CHIPS DE AJOS Y OREG": "PITA CHIPS DE AJOS Y OREGANO 50 GR",
        "PITA CHIPS INTEGRAL DE AJ": "PITA CHIPS INTEGRAL DE AJOS Y OREGANO 50 GR",
        "GRANUTS NUECES": "GRANUTS MANI C/ PASAS",
        "GALLETA SALVADO PARMESANO NANCY NATUR 62": "GALLETA SALVADO PARMESANO NANCY NATUR 62 G",
        "GALLETA AVENA Y CASTANA X 5 NANCY NATUR": "GALLETA AVENA Y CASTANA X 5 NANCY NATUR CLASICA",
        "PALITOS LINAZA Y SALVADO NANCY NATUR 55": "PALITOS LINAZA Y SALVADO NANCY NATUR 55 G",
        "BARRA DE CEREAL": "BARRA DE CEREAL QFOODS",
        "CHIPS AHOY": "CHIPS AHOY",
        "FRUTO SECO NUEZ": "FRUTO SECO NUEZ",
    }

    galletas_aliases = {
        "GALLETA GALCITAS FRESA": "GLACITAS FRESA",
        "GALLETA CON KIWICHA 100 G": "GALLETA DE KIWICHA AMAIA",
        "GALLETAS AVENA MIEL SABRI": "GALLETAS AVENA MIEL SABRINA",
        "GALLETAS CHOCOCHIPS SABRI": "GALLETAS CHOCOCHIPS SABRINA",
        "GALLETAS MACA Y CANELA SA": "GALLETAS MACA Y CANELA SABRINA",
        "GALLETAS QUINUA Y ALGARRO": "GALLETAS QUINUA Y ALGARROBINA SABRINA",
        "GALLETA DE CHOCOCHIP GRAN": "GALLETA DE CHOCOCHIP GRANDE",
        "COOKIES DE AVENA CON CHOC": "COOKIES DE AVENA CON CHOCO CHIPS Y CHOCOLATE BITTER",
        "COOKIES DE CHOCO CHIPS CO": "COOKIES DE CHOCO CHIPS CON CHOCOLATE BITTER",
        "COOKIES DE CHOCOLATE CON": "COOKIES DE CHOCOM CHIPS CON TROZOS DE BROWNIE",
        "COOKIES DE CHOCOM CHIPS C": "COOKIES DE CHOCOM CHIPS CON TROZOS DE BROWNIE",
        "GALLETA CHOCOLATE LENTEJAS": "GALLETA CHOCOLATE LENTEJAS",
    }

    confiteria_aliases = {
        "TRIANGULO CHOCOLATE": "CHOCOLATE TRIANGULO DE LECHE 30GR",
        "MENTITAS": "MENTITAS 1",
        "LENTEJITAS 16 G": "GALLETA CHOCOLATE LENTEJAS",
        "GELATINA 8 ONZAS": "GELATINA DE FRESA 8 ONZ",
        "PAN CON HUEVO": "PAN CON HUEVO ECONOMICO",
        "HAMBURGUESA AL PLATO CON PAPAS FRITAS": "HAMBURGUESA DOBLE CARNE CON PAPAS FRITAS",
        "PIZZA EN CONO": "PIZZA DE AMERICANA",
    }

    vitrina_aliases = {
        "CROISANT DE POLLO": "CROISSANT DE POLLO",
        "CROISANT DE POLLO CON PECANAS": "CROISSANT DE POLLO CON APIO",
        "PITA CAPRESSE": "PITA CAPRESSE",
        "SANDWICH DE FILETE": "SANDWICH DE FILETE DE POLLO",
        "SANDWICH DE MILANESA": "SANDWICH CON MILANESA",
        "SANDWICH CON MILANESA JUNIOR": "SANDWICH CON MILANESA",
        "COMBO SANDWICH + EPIC": "COMBO SANDWICH + PEPSI",
        "SANDWICH DE CHORIZO": "CHORIPAN",
        "SANDWICH PARRILLERO DE CHORIZO": "CHORIPAN",
    }

    bistec_aliases = {
        "BISTEC A LA PLANCHA CON PAPAS FRITAS Y A": "BISTEC A LA PLANCHA CON PAPAS FRITAS Y ARROZ",
    }

    broaster_aliases = {
        "CHICHARRON DE POLLO CON PAPAS FRITAS+ EN": "CHICHARRON DE POLLO CON PAPAS FRITAS Y ENSALADA",
    }

    write_group_report("Bistec", ERP_BISTEC, products, code_to_group, bistec_aliases)
    chaufa_aliases = {
        "CHAUFA AMAZONICO + BEBIDA": "CHAUFA AMAZONICO",
    }

    write_group_report("Broaster", ERP_BROASTER, products, code_to_group, broaster_aliases)
    complementos_aliases = {
        "PORCIN DE HOT DOG EXTRA": "PORCION DE HOT DOG EXTRA",
    }

    write_group_report("Chaufa", ERP_CHAUFA, products, code_to_group, chaufa_aliases)
    entradas_carta_aliases = {
        "CAUSA CON CHICHARRON DE POLLO ESCABECHAD": "CAUSA CON CHICHARRON DE POLLO ESCABECHADO",
    }

    write_group_report("Complementos", ERP_COMPLEMENTOS, products, code_to_group, complementos_aliases)
    hamburguesas_aliases = {
        "HAMBURGUESA DOBLE CARNE QUESO TOCINO CON": "HAMBURGUESA DOBLE CARNE QUESO TOCINO CON PAPAS FRITAS",
        "HAMBURGUESA ROYAL CON TOCINO Y PAPAS FRI": "HAMBURGUESA ROYAL CON TOCINO Y PAPAS FRITAS",
        "HAMBURGUESA AL PLATO CON PAPAS FRITAS": "HAMBURGUESA DOBLE CARNE CON PAPAS FRITAS",
    }

    write_group_report("Entradas Carta", ERP_ENTRADAS_CARTA, products, code_to_group, entradas_carta_aliases)
    milanesa_aliases = {
        "MILANESA CON ENSALADA COCIDA Y ARROZ - C": "MILANESA CON ENSALADA COCIDA Y ARROZ - CHICO",
        "MILANESA CON ENSALADA FRESCA Y ARROZ - C": "MILANESA CON ENSALADA FRESCA Y ARROZ - CHICO",
        "MILANESA CON ENSALADA FRESCA Y PAPA FRIT": "MILANESA CON ENSALADA FRESCA Y PAPA FRITA",
        "MILANESA CON ENSALADA FRESCA Y PAPA FRITAS": "MILANESA CON ENSALADA FRESCA Y PAPA FRITA",
        "MILANESA CON PAPA SANCOCHADA Y ARROZ- CH": "MILANESA CON PAPA SANCOCHADA Y ARROZ - CHICO",
        "MILANESA CON PAPAS FRITAS Y ARROZ - CHIC": "MILANESA CON PAPAS FRITAS Y ARROZ - CHICO",
    }

    write_group_report(
        "Hamburguesas y Sandwiches",
        ERP_HAMBURGUESAS_Y_SANDWICHES,
        products,
        code_to_group,
        hamburguesas_aliases,
    )
    postre_vitrina_aliases = {
        "KEKE MARMOLEADO PORCION": "KEKE MARMOLEADOR",
        "GELATINA BATIDA DE PIÑA 8 ONZ": "GELATINA BATIDA DE PINA 8 ONZ",
        "GELATINA DE PIÑA 8 ONZ": "GELATINA DE PINA 8 ONZ",
        "GELATINA DE PIÑA LIGTH 6 ONZ": "GELATINA DE PINA LIGTH 6 ONZ",
    }

    write_group_report("Milanesa", ERP_MILANESA, products, code_to_group, milanesa_aliases)
    fruta_aliases = {
        "PERA DE AGUA SN": "PERA FRUTA",
        "PIÑA GOLDEN PICADA 1/2 LITRO": "PINA GOLDEN PICADA 1/2 LITRO",
        "PIÑA GOLDEN PICADA 1/4 LITRO": "PINA GOLDEN PICADA 1/4 LITRO",
    }

    postre_menu_aliases = {
        "KEKE DE CHOCOLATE MN": "KEKE DE CHOCOLATE",
        "KEKE DE VAINILLA MN": "KEKE DE VAINILLA",
        "COMPOTA DE PIÑA": "COMPOTA DE PINA",
        "GELATINA BATIDA DE PIÑA 4 ONZ": "GELATINA BATIDA DE PINA 4 ONZ",
        "GELATINA DE PIÑA 4 ONZ": "GELATINA DE PINA 4 ONZ",
        "GELATINA DE PIÑA LIGTH 4 ONZ": "GELATINA DE PINA LIGTH 4 ONZ",
    }

    write_group_report("Postre de Vitrina", ERP_POSTRE_DE_VITRINA, products, code_to_group, postre_vitrina_aliases)
    write_group_report("Postre de Menú", ERP_POSTRE_DE_MENU, products, code_to_group, postre_menu_aliases)
    sopas_aliases = {
        "DIETA DE POLLO": "SOPA DIETA DE POLLO",
        "CHUPE CUZQUEÑO": "CHUPE CUZQUENO",
        "SOPA ESPAÑOLA": "SOPA ESPANOLA",
    }

    write_group_report("Fruta", ERP_FRUTA, products, code_to_group, fruta_aliases)
    write_group_report("Sopas", ERP_SOPAS, products, code_to_group, sopas_aliases)
    write_group_report("Regular", ERP_REGULAR, products, code_to_group, {})
    write_group_report("Snacks Saludables", ERP_SNACKS_SALUDABLES, products, code_to_group, {})
    write_group_report("Sandwich's Vitrina", ERP_SANDWICHS_VITRINA, products, code_to_group, vitrina_aliases)
    write_group_report("Ensaladas Regular", ERP_ENSALADAS_REGULAR, products, code_to_group, {})
    write_group_report("Bocaditos Dulces", ERP_BOCADITOS_DULCES, products, code_to_group, bocaditos_dulces_aliases)
    write_group_report("Helados", ERP_HELADOS, products, code_to_group, helados_aliases)
    write_group_report("Postres Varios", ERP_POSTRES_VARIOS, products, code_to_group, postres_varios_aliases)
    write_group_report("Tortas", ERP_TORTAS, products, code_to_group, tortas_aliases)
    write_group_report("Kekes", ERP_KEKES, products, code_to_group, kekes_aliases)
    write_group_report("Bocaditos Salados", ERP_BOCADITOS_SALADOS, products, code_to_group, bocaditos_salados_aliases)
    write_group_report("Cheessecake Y Otros", ERP_CHEESSECAKE_Y_OTROS, products, code_to_group, cheesecake_aliases)
    write_group_report("Snack", ERP_SNACK, products, code_to_group, snack_aliases)
    write_group_report("Galletas", ERP_GALLETAS, products, code_to_group, galletas_aliases)
    write_group_report("Confiteria", ERP_CONFITERIA, products, code_to_group, confiteria_aliases)
    write_group_report("Yogurt Bebible", ERP_YOGURT_BEBIBLE, products, code_to_group, {})
    write_group_report("Jugos y otros", ERP_JUGOS_Y_OTROS, products, code_to_group, jugos_aliases)
    write_group_report("Rehidratantes", ERP_REHIDRATANTES, products, code_to_group, {})
    write_group_report("Frugos", ERP_FRUGOS, products, code_to_group, frugos_aliases)
    write_group_report("Aguas", ERP_AGUAS, products, code_to_group, aguas_plain_aliases)
    write_group_report("Aguas Saborizadas", ERP_AGUAS_SABORIZADAS, products, code_to_group, aguas_aliases)
    write_group_report("Energizantes", ERP_ENERGIZANTES, products, code_to_group, {})
    write_group_report("Gaseosas", ERP_GASEOSAS, products, code_to_group, gaseosas_aliases)
    write_group_report("Empresas", ERP_EMPRESAS, products, code_to_group, empresas_aliases)
    write_group_report("Bebidas Frías", ERP_BEBIDAS_FRIAS, products, code_to_group, frias_aliases)
    write_group_report("Bebidas Calientes", ERP_BEBIDAS_CALIENTES, products, code_to_group, calientes_aliases)

    write_productos_catalogo(products, code_to_group, groups)

    by_group: dict[str, int] = {}
    for g in code_to_group.values():
        by_group[g] = by_group.get(g, 0) + 1

    print(f"OK: {len(code_to_group)} productos catalogados → {OUT}")
    for g in groups:
        print(f"OK: {by_group[g]} en «{g}»")


if __name__ == "__main__":
    main()
