import i18n from 'i18next'
import {initReactI18next} from "react-i18next";
import zhTrans from "@/locales/zh.json";
import zhCHTTrans from "@/locales/zh-CHT.json";
import enTrans from "@/locales/en.json";
import koTrans from "@/locales/ko.json";
import jaTrans from "@/locales/ja.json";
import deTrans from "@/locales/de.json";
import frTrans from "@/locales/fr.json";
import idTrans from "@/locales/id.json";
import ruTrans from "@/locales/ru.json";


i18n.use(initReactI18next).init({
  resources: {
    'zh': {
      translation: zhTrans,
    },
    'zh-CHT': {
      translation: zhCHTTrans,
    },
    'en': {
      translation: enTrans,
    },
    'ko': {
      translation: koTrans,
    },
    'ja': {
      translation: jaTrans,
    },
    'de': {
      translation: deTrans,
    },
    'fr': {
      translation: frTrans,
    },
    'id': {
      translation: idTrans,
    },
    'ru': {
      translation: ruTrans,
    },
  },
  lng: "zh",
  fallbackLng: "zh",
  debug: process.env.NODE_ENV === "development",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
