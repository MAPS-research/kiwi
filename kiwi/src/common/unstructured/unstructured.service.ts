import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UnstructuredService {
  private readonly logger = new Logger(UnstructuredService.name);
  constructor(private configService: ConfigService) {}
  private readonly unstructuredApiUrl: string = this.configService.get<string>(
    'UNSTRUCTURED_API_URL',
  )!;

  async partitionDocument(
    documentContent: Uint8Array,
    documentType: string,
    documentName: string,
    strategy: 'ocr_only' | 'hi_res' = 'ocr_only',
    // Whether to let unstructured group the elements into `CompositeElement`
    // chunks. This is not cosmetic: `DocumentService.embedDocument` only embeds
    // `CompositeElement`/`Image`/`Table`, so an unchunked partition produces
    // text the embedder silently discards. Defaults to the historical
    // behaviour — chunk on `ocr_only`, leave `hi_res` raw so its Image/Table
    // blocks survive as their own elements.
    chunk: boolean = strategy === 'ocr_only',
  ): Promise<Array<{ [k: string]: any }>> {
    const documentFile = new Blob([new Uint8Array(documentContent)], {
      type: documentType,
    });

    const formData = new FormData();
    formData.append('files', documentFile, documentName);
    formData.append('strategy', strategy);
    formData.append('languages', 'en');
    formData.append('unique_element_ids', 'True');
    formData.append('max_characters', '1024');
    if (strategy === 'hi_res') {
      formData.append('hi_res_model_name', 'yolox_quantized');
      formData.append('extract_image_block_types', 'Image');
      formData.append('extract_image_block_types', 'Table');
      formData.append('coordinates', 'True');
    }
    if (chunk) {
      formData.append('chunking_strategy', 'by_title');
      formData.append('multipage_sections', 'False');
    }

    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
      },
      body: formData,
    };

    this.logger.debug('Partition document started');

    try {
      const response = await fetch(
        `${this.unstructuredApiUrl}/general/v0/general`,
        options,
      );
      const partitionResponse = await response.json();

      if (response.status === 200 && partitionResponse) {
        return partitionResponse;
      } else {
        throw new Error('Failed to partition document');
      }
    } catch (error) {
      this.logger.error('Error:', error);
      throw new Error('Failed to partition document');
    }
  }
}
