const fs = require("fs").promises;
const request = require("request-promise");
const cheerio = require("cheerio");

const isWhitespaceTextNode = (node) => {
  if(node.type !== 'text'){
      return false;
  }
  if(new RegExp('^\\s*$').test(node.data)){
      return true;
  }
  return false;
};

const getFirstTextNode = (node, $)  => {
  const contents = node.contents();

  const nonWhitespaceTextContents = contents.filter(nodeIndex=>{
    const node = contents[nodeIndex];
    if(isWhitespaceTextNode(node)){
        return false;
    }else{
        return true;
    }
  });

  return nonWhitespaceTextContents[0];
};

request("https://service.berlin.de/standorte/buergeraemter/")
  .then((response) => {
    let $ = cheerio.load(response);

    const data = [];

    const blocks = $(".azlist .ort-group");
    for (let index = 0; index < blocks.length; index += 1){
      const items = [];

      const refs = $(blocks[index]).find(".list .topic-dls a");
      for (let rIndex = 0; rIndex < refs.length; rIndex += 1){
        const href = $(refs[rIndex]).attr("href");
        const href_split = href.split("/");
        items.push({
          label: $(refs[rIndex]).text(),
          id: href_split[2],
          url: "https://service.berlin.de" + href,
        });
      }

      data.push({
        label: $(getFirstTextNode($(blocks[index]).find("h2.letter"), $)).text(),
        items,
      });
    }

    return Promise.all(data.map((block, bi) => {
      return Promise.all(block.items.map((item, ii) => {
        return request(item.url)
          .then((response) => {
            let $$ = cheerio.load(response);
            const c = $$(".column-content");

            const services = [];

            const sItems = $(c).find(".termin .azlist .row-fluid");
            for (let sIndex = 0; sIndex < sItems.length; sIndex += 1){
              const service = {
                appointment: false,
                label: $(sItems[sIndex]).find("a").text().replace("\n", "").trim(),
                url: "https://service.berlin.de" + $(sItems[sIndex]).find("a").attr("href"),
              };
              const input = $(sItems[sIndex]).find("input");
              if (input.length >= 1) {
                service.appointment = true;
                service.id = $(input).attr("value");
              }

              services.push(service);
            }

            const accessibility = [];

            const aItems = $$(".content-marginal .accessibilty-symbol");
            for (let aIndex = 0; aIndex < aItems.length; aIndex += 1){
              const src = $(aItems[aIndex]).attr("src");
              const src_split = src.split("/");
              const id = src_split[src_split.length - 1].split(".")[0];

              accessibility.push({
                image: src,
                title: $(aItems[aIndex]).attr("title"),
                id: id,
              });
            }

            data[bi].items[ii].details = {
              accessibility,
              title: $(c).find(".html5-header .title").text(),
              coordinates: $(c).find("script").get()[0].children[0].data.match(/\d\d.\d\d\d\d\d\d\d\d/g),
              openings: $(c).find(".openings").html(), //TODO: maybe break up
              openings_info: $(c).find(".info-openings").html(),
              payment: $(c).find(".zahlung").html(),
              other: $(c).find(".info-way").html(),
              // 'https://service.berlin.de/terminvereinbarung/termin/tag.php?termin=1&amp;amp;herkunft=1' &dienstleister=STANDORTID &anliegen=ANLIEGENID
              services,
              location_info: $(c).find(".content-marginal .contact .body").html(),
              traffic_info: $(c).find(".content-marginal .anbindung .adr_wrapper").html(),
              pdf: $(c).find(".content-marginal .print-hide .body a").attr("href"),
            };
          });
      }));
    }))
    .then(() => {
      return fs.writeFile("aemter-output.json", JSON.stringify(data), "utf8");
    });
  })
  .then(() => {
    console.log("done");
    process.exit();
  })
  .catch((err) => {
    throw err;
  });