import {
  getPersona,
} from "../config/personas.js";

function removeMention(
  text: string
): string {

  return text
    .replace(
      /<@[A-Z0-9]+>/g,
      ""
    )
    .trim();
}

export function routeMessage(
  text: string
) {

  const clean =
    removeMention(text);

  const lower =
    clean.toLowerCase();

  if (
    lower.startsWith("hr ") ||
    lower.startsWith("recruit ") ||
    lower.startsWith("candidate ")
  ) {

    return {
      persona:
        getPersona("hr"),

      cleanText:
        clean.replace(
          /^(hr|recruit|candidate)\s*/i,
          ""
        ),
    };
  }

  if (
    lower.startsWith("dev ") ||
    lower.startsWith("developer ") ||
    lower.startsWith("code ")
  ) {

    return {
      persona:
        getPersona("developer"),

      cleanText:
        clean.replace(
          /^(dev|developer|code)\s*/i,
          ""
        ),
    };
  }

  if (
    lower.startsWith("sales ")
  ) {

    return {
      persona:
        getPersona("sales"),

      cleanText:
        clean.replace(
          /^sales\s*/i,
          ""
        ),
    };
  }

  if (
    lower.startsWith("marketing ")
  ) {

    return {
      persona:
        getPersona("marketing"),

      cleanText:
        clean.replace(
          /^marketing\s*/i,
          ""
        ),
    };
  }

  if (
    lower.startsWith("finance ")
  ) {

    return {
      persona:
        getPersona("finance"),

      cleanText:
        clean.replace(
          /^finance\s*/i,
          ""
        ),
    };
  }

  if (
    lower.startsWith("support ")
  ) {

    return {
      persona:
        getPersona("support"),

      cleanText:
        clean.replace(
          /^support\s*/i,
          ""
        ),
    };
  }

  if (
    lower.startsWith("qa ")
  ) {

    return {
      persona:
        getPersona("qa"),

      cleanText:
        clean.replace(
          /^qa\s*/i,
          ""
        ),
    };
  }

  if (
    lower.startsWith("research ")
  ) {

    return {
      persona:
        getPersona("research"),

      cleanText:
        clean.replace(
          /^research\s*/i,
          ""
        ),
    };
  }

  return {
    persona:
      getPersona("ops"),

    cleanText:
      clean,
  };
}