import type { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { containerClient } from "App/helper/blobStorageConfig";
import GenerateManifestValidator from "App/Validators/GenerateManifestValidator";
import axios from "axios";
import fs from "fs";
import pdf from "pdf-creator-node";
import Env from "@ioc:Adonis/Core/Env";

export default class ShippingLabelsController {
  /**
   * generateManifest
   */
  public async generateManifest({ request, response }: HttpContextContract) {
    const data = await request.validate(GenerateManifestValidator);
    const signature = request.header("signature");
    if (!signature) {
      response.unauthorized({
        errors: [{ message: "signature not found" }],
      });
    }
    const options = {
      format: "A4",
      orientation: "portrait",
      border: "10mm",
      header: {
        height: "45mm",
        contents: '<div style="text-align: center;"></div>',
      },
      footer: {
        height: "28mm",
        contents: {
          // first: "Cover page",
          // 2: "Second page", // Any page number is working. 1-based index
          default:
            '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>',
          // last: "Last Page",
        },
      },
    };

    var html = fs.readFileSync("public/pdf-template.html", "utf8");
    const uuid = new Date().getTime();
    try {
      const { data: shippingApiData } = await axios.post(
        Env.get("INTARGOS_CUSTOM_MAINFEST_API"),
        data,
        {
          headers: { signature },
        }
      );
      const dataforPdf = {
        ...shippingApiData.resultDetails?.[data?.waybill],
        waybill: data?.waybill,
      };

      const newFilePath = "tmp/uploads/" + uuid + ".pdf";
      var document = {
        html: html,
        data: dataforPdf,
        path: newFilePath,
        type: "",
      };
      await pdf.create(document, options);
      const content = fs.readFileSync(newFilePath);
      const blockBlobClient = containerClient.getBlockBlobClient(uuid + ".pdf");
      try {
        await blockBlobClient.upload(content, content.length);
      } catch (e) {
        response.badGateway({
          errors: [{ message: "Internal server eroor, not uploaded" }],
        });
      }
      fs.unlinkSync(newFilePath);
      return { url: blockBlobClient.url };
    } catch (e) {
      response.unauthorized({
        errors: [{ message: e.response.data.response }],
      });
    }
  }
}
