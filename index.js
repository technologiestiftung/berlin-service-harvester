const fs = require("fs").promises;
const request = require("request-promise");
const cheerio = require("cheerio");

const services = {};

const list2array = (block, $, _linkList) => {
  const isLinkList = _linkList || false;
  const listItems = $(block).find("ul.list li");
  if (listItems.length === 0) {
    // looks like this is not a list
    return $(block).find(".inner").html();
  } else {
    const array = [];
    for (let index = 0; index < listItems.length; index += 1) {
      if (isLinkList) {
        const link = $(listItems[index]).find("a");
        array.push({
          url: link.attr('href'),
          label: link.text(),
        });
      } else {
        array.push($(listItems[index]).html());
      }
    }
    return array;
  }
};

fs.readFile("services.json", "utf8")
  .then((data) => {
    const targets = JSON.parse(data);
    return Promise.all(targets.map((url) => {
      return request(url)
        .then((response) => {
          let $ = cheerio.load(response);
    
          const urlSplit = url.split("/");
          let id = urlSplit[urlSplit.length - 1];
          if (id.length === 0) {
            id = urlSplit[urlSplit.length - 2];
          }
    
          const service = {
            title: $(".html5-section.article h1.title").text(),
            intro: $(".html5-section.article .body.dienstleistung .block:first-child").html(),
          };
    
          const blocks = $(".html5-section.article .body.dienstleistung .block");
          
          for (let index = 0; index < blocks.length; index += 1){
            // ignore intro
            if (index > 0) {
              const block = $(blocks[index]);
              const h2 = $(block).find("h2").text();
              if (h2 === "Zuständige Behörden") {
                const appointments = { behoerden: [] };
                // link for all over Berlin
                const berlinLink = $(block).find(".zmstermin-multi a");
                appointments["berlin"] = {
                  url: berlinLink.attr("href"),
                  label: berlinLink.text(),
                };
                // link for individual districts or offices
                const behoerden = $(block).find(".behoerdenitem");
                for (let bIndex = 0; bIndex < behoerden.length; bIndex += 1) {
                  const rows = $(behoerden[bIndex]).find(".row");
                  const behoerde = { offices: [] };
                  for (let rIndex = 0; rIndex < rows.length; rIndex += 1) {
                    const linkLabel = $(rows[rIndex]).find(".span5").text();
                    const linkUrl = $(rows[rIndex]).find(".span2 a").attr("href");
                    if (rIndex === 0) {
                      behoerde["all"] = {
                        url: linkUrl,
                        label: linkLabel,
                      };
                    } else {
                      behoerde.offices.push({
                        url: linkUrl,
                        label: linkLabel,
                      });
                    }
                  }
                  appointments.behoerden.push(behoerde);
                }

                service["appointment"] = appointments;
              } else if (h2 == "Formulare") {
                service["forms"] = list2array(block, $, true);
              } else if (h2 == "Weiterführende Informationen") {
                service["more"] = list2array(block, $, true);
              } else if (h2 == "Gebühren") {
                service["costs"] = list2array(block, $);
              } else if (h2 == "Durchschnittliche Bearbeitungszeit") {
                service["time"] = list2array(block, $);
              } else if (h2 == "Rechtsgrundlagen") {
                service["legal"] = list2array(block, $, true);
              } else if (h2 == "Erforderliche Unterlagen") {
                service["documents"] = list2array(block, $);
              } else if (h2 == "Voraussetzungen") {
                service["requirements"] = list2array(block, $);
              }
            }
          }
    
          services[id] = service;
        })
        .catch((err) => {
          console.log(err);
        });
    }));
  })
  .then(() => {
    let str = JSON.stringify(services);

    // make the JSON more readable
    str = str.split("    ").join("");
    str = str.split("\\n").join("");

    return fs.writeFile("services-output.json", str, "utf8");
  })
  .then(() => {
    console.log("done");
    process.exit();
  })
  .catch((err) => {
    console.log(err);
  });