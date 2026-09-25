'use client';

import Image from 'next/image';
import { ChangeEvent, FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type SelectedImage = {
  id: string;
  file: File;
  originalSize: number;
  previewUrl: string;
};

const MAX_IMAGES = 100;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_QUALITY = 0.82;

const UPLOAD_BATCH_SIZE = 5;

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = image.naturalWidth;
      let height = image.naturalHeight;

      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const scale = Math.min(
          MAX_IMAGE_DIMENSION / width,
          MAX_IMAGE_DIMENSION / height
        );

        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('Could not prepare the image for compression.'));
        return;
      }

      context.drawImage(image, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Could not compress this picture.'));
            return;
          }

          const extension =
            file.type === 'image/png' ? 'png' : 'jpg';

          const mimeType =
            file.type === 'image/png'
              ? 'image/png'
              : 'image/jpeg';

          const compressedFile = new File(
            [blob],
            `${file.name.replace(/\.[^/.]+$/, '')}-optimized.${extension}`,
            {
              type: mimeType,
              lastModified: Date.now(),
            }
          );

          resolve(compressedFile);
        },
        mimeType,
        IMAGE_QUALITY
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not read "${file.name}".`));
    };

    image.src = objectUrl;
  });
}

export default function AddProductForm() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  const [images, setImages] = useState<SelectedImage[]>([]);
  const [coverImageId, setCoverImageId] = useState<string | null>(null);

  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [processingCount, setProcessingCount] = useState(0);

  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);

  const [originalTotalSize, setOriginalTotalSize] = useState(0);
  const [compressedTotalSize, setCompressedTotalSize] = useState(0);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setErrorMessage('');
    setSuccessMessage('');

    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    if (images.length + selectedFiles.length > MAX_IMAGES) {
      setErrorMessage(
        `You can upload a maximum of ${MAX_IMAGES} pictures for one product.`
      );
      return;
    }

    const invalidFile = selectedFiles.find(
      (file) =>
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > MAX_FILE_SIZE
    );

    if (invalidFile) {
      setErrorMessage(
        'Each picture must be JPG, PNG, or WebP and must not exceed 5 MB.'
      );
      return;
    }

    setIsProcessingImages(true);
    setProcessingCount(0);

    try {
      const optimizedImages: SelectedImage[] = [];

      for (const file of selectedFiles) {
        const compressedFile = await compressImage(file);

        const previewUrl = URL.createObjectURL(compressedFile);

        optimizedImages.push({
          id: crypto.randomUUID(),
          file: compressedFile,
          originalSize: file.size,
          previewUrl,
        });

        setProcessingCount((current) => current + 1);
      }

      setImages((current) => {
        const updated = [...current, ...optimizedImages];

        if (!coverImageId && updated.length > 0) {
          setCoverImageId(updated[0].id);
        }

        return updated;
      });

      setOriginalTotalSize((current) =>
        current +
        selectedFiles.reduce((total, file) => total + file.size, 0)
      );

      setCompressedTotalSize((current) =>
        current +
        optimizedImages.reduce(
          (total, image) => total + image.file.size,
          0
        )
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong while optimizing the pictures.'
      );
    } finally {
      setIsProcessingImages(false);
      event.target.value = '';
    }
  }

  function removeImage(id: string) {
    if (isSubmitting || isProcessingImages) {
      return;
    }

    setImages((current) => {
      const imageToRemove = current.find((image) => image.id === id);

      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl);

        setOriginalTotalSize(
          (size) => size - imageToRemove.originalSize
        );

        setCompressedTotalSize(
          (size) => size - imageToRemove.file.size
        );
      }

      const updated = current.filter((image) => image.id !== id);

      if (coverImageId === id) {
        setCoverImageId(updated[0]?.id ?? null);
      }

      return updated;
    });
  }

  async function uploadImages(
    productId: string,
    selectedImages: SelectedImage[]
  ) {
    const uploadedRows: {
      product_id: string;
      colour_name: null;
      image_url: string;
      quantity: number;
      is_active: boolean;
      display_order: number;
    }[] = [];

    const uploadedStoragePaths: string[] = [];

    setUploadTotal(selectedImages.length);
    setUploadedCount(0);

    for (
      let batchStart = 0;
      batchStart < selectedImages.length;
      batchStart += UPLOAD_BATCH_SIZE
    ) {
      const batch = selectedImages.slice(
        batchStart,
        batchStart + UPLOAD_BATCH_SIZE
      );

      const batchResults = await Promise.all(
        batch.map(async (selectedImage, batchIndex) => {
          const extension =
            selectedImage.file.type === 'image/png'
              ? 'png'
              : 'jpg';

          const storagePath = `variants/${productId}/${crypto.randomUUID()}.${extension}`;

          const { error: uploadError } = await supabase.storage
            .from('fabrics')
            .upload(storagePath, selectedImage.file, {
              cacheControl: '3600',
              upsert: false,
              contentType: selectedImage.file.type,
            });

          if (uploadError) {
            throw new Error(
              `Failed to upload "${selectedImage.file.name}": ${uploadError.message}`
            );
          }

          uploadedStoragePaths.push(storagePath);

          setUploadedCount((current) => current + 1);

          return {
            product_id: productId,
            colour_name: null,
            image_url: storagePath,
            quantity: 0,
            is_active: true,
            display_order: batchStart + batchIndex,
          };
        })
      );

      uploadedRows.push(...batchResults);
    }

    const { error: variantError } = await supabase
      .from('fabric_variants')
      .insert(uploadedRows);

    if (variantError) {
      throw new Error(
        `Pictures uploaded, but saving picture records failed: ${variantError.message}`
      );
    }

    return {
      uploadedRows,
      uploadedStoragePaths,
    };
  }

  async function cleanupProduct(
    productId: string,
    storagePaths: string[]
  ) {
    if (storagePaths.length > 0) {
      await supabase.storage.from('fabrics').remove(storagePaths);
    }

    await supabase
      .from('fabric_variants')
      .delete()
      .eq('product_id', productId);

    await supabase
      .from('fabric_products')
      .delete()
      .eq('id', productId);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isProcessingImages) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setUploadedCount(0);
    setUploadTotal(0);

    const trimmedName = name.trim();
    const trimmedType = type.trim();
    const trimmedDescription = description.trim();
    const numericPrice = Number(price);

    if (!trimmedName) {
      setErrorMessage('Please enter the product name.');
      return;
    }

    if (!trimmedType) {
      setErrorMessage('Please enter the fabric type.');
      return;
    }

    if (!price || Number.isNaN(numericPrice) || numericPrice < 0) {
      setErrorMessage('Please enter a valid price.');
      return;
    }

    if (images.length === 0) {
      setErrorMessage('Please select at least one picture.');
      return;
    }

    if (!coverImageId) {
      setErrorMessage('Please select a cover picture.');
      return;
    }

    setIsSubmitting(true);

    let productId: string | null = null;
    let storagePaths: string[] = [];

    try {
      const { data: product, error: productError } =
        await supabase
          .from('fabric_products')
          .insert({
            name: trimmedName,
            type: trimmedType,
            description: trimmedDescription || null,
            price: numericPrice,
            is_active: true,
          })
          .select('id')
          .single();

      if (productError || !product) {
        throw new Error(
          productError?.message ||
            'Failed to create the product.'
        );
      }

      productId = product.id;

      const uploadResult = await uploadImages(productId, images);

      storagePaths = uploadResult.uploadedStoragePaths;

      const coverIndex = images.findIndex(
        (image) => image.id === coverImageId
      );

      const coverImageUrl =
        uploadResult.uploadedRows[coverIndex]?.image_url ??
        null;

      if (!coverImageUrl) {
        throw new Error(
          'Failed to determine the cover picture.'
        );
      }

      const { error: coverError } = await supabase
        .from('fabric_products')
        .update({
          cover_image_url: coverImageUrl,
        })
        .eq('id', productId);

      if (coverError) {
        throw new Error(
          `Product was created, but saving the cover picture failed: ${coverError.message}`
        );
      }

      setSuccessMessage(
        'Product added successfully. Opening your catalogue...'
      );

      setTimeout(() => {
        router.push('/admin/catalogue/products');
        router.refresh();
      }, 800);
    } catch (error) {
      if (productId) {
        await cleanupProduct(productId, storagePaths);
      }

      setUploadedCount(0);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong while adding the product.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const progress =
    uploadTotal > 0
      ? Math.round((uploadedCount / uploadTotal) * 100)
      : 0;

  const compressionSaved =
    originalTotalSize > 0
      ? Math.max(
          0,
          Math.round(
            ((originalTotalSize - compressedTotalSize) /
              originalTotalSize) *
              100
          )
        )
      : 0;

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          display: 'grid',
          gap: '18px',
          padding: '24px',
          border: '1px solid #ddd',
          borderRadius: '14px',
          background: '#fff',
        }}
      >
        <label>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>
            Product Name
          </div>

          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Men Lace"
            disabled={isSubmitting || isProcessingImages}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ccc',
              borderRadius: '8px',
            }}
          />
        </label>

        <label>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>
            Fabric Type
          </div>

          <input
            type="text"
            value={type}
            onChange={(event) => setType(event.target.value)}
            placeholder="e.g. Lace"
            disabled={isSubmitting || isProcessingImages}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ccc',
              borderRadius: '8px',
            }}
          />
        </label>

        <label>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>
            Common Price
          </div>

          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="e.g. 50000"
            disabled={isSubmitting || isProcessingImages}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ccc',
              borderRadius: '8px',
            }}
          />
        </label>

        <label>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>
            Description{' '}
            <span style={{ color: '#777' }}>(optional)</span>
          </div>

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            placeholder="Describe the fabric or product..."
            disabled={isSubmitting || isProcessingImages}
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ccc',
              borderRadius: '8px',
              resize: 'vertical',
            }}
          />
        </label>

        <div>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>
            Product Pictures
          </div>

          <p style={{ marginTop: 0, color: '#666' }}>
            Select all available pictures at once. The app will
            optimize them before uploading to save time and data.
          </p>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleImageChange}
            disabled={
              isSubmitting ||
              isProcessingImages ||
              images.length >= MAX_IMAGES
            }
          />

          <p style={{ color: '#777', fontSize: '14px' }}>
            {images.length} / {MAX_IMAGES} pictures selected
          </p>
        </div>

        {isProcessingImages && (
          <div
            style={{
              padding: '18px',
              border: '1px solid #ddd',
              borderRadius: '12px',
              background: '#f8f8f8',
            }}
          >
            <strong>Optimizing pictures...</strong>

            <p
              style={{
                margin: '8px 0 0',
                color: '#666',
              }}
            >
              Processing picture {processingCount} of the
              selected pictures.
            </p>
          </div>
        )}

        {images.length > 0 && !isProcessingImages && (
          <div
            style={{
              padding: '16px',
              border: '1px solid #ddd',
              borderRadius: '12px',
              background: '#fafafa',
            }}
          >
            <strong>Picture optimization</strong>

            <p
              style={{
                margin: '8px 0 4px',
                color: '#555',
              }}
            >
              Original size:{' '}
              {formatFileSize(originalTotalSize)}
            </p>

            <p
              style={{
                margin: '4px 0',
                color: '#555',
              }}
            >
              Upload size:{' '}
              {formatFileSize(compressedTotalSize)}
            </p>

            {compressionSaved > 0 && (
              <p
                style={{
                  margin: '4px 0 0',
                  fontWeight: 600,
                }}
              >
                Saved approximately {compressionSaved}% of the
                image data.
              </p>
            )}
          </div>
        )}

        {images.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '14px',
            }}
          >
            {images.map((image, index) => (
              <div
                key={image.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  padding: '10px',
                }}
              >
                <Image
                  src={image.previewUrl}
                  alt={`Product picture ${index + 1}`}
                  width={300}
                  height={300}
                  unoptimized
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                  }}
                />

                <p
                  style={{
                    margin: '8px 0 0',
                    fontSize: '12px',
                    color: '#777',
                  }}
                >
                  {formatFileSize(image.file.size)}
                </p>

                <label
                  style={{
                    display: 'block',
                    marginTop: '8px',
                    fontSize: '14px',
                  }}
                >
                  <input
                    type="radio"
                    name="coverImage"
                    checked={coverImageId === image.id}
                    onChange={() =>
                      setCoverImageId(image.id)
                    }
                    disabled={isSubmitting}
                  />{' '}
                  Use as cover
                </label>

                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  disabled={
                    isSubmitting || isProcessingImages
                  }
                  style={{
                    width: '100%',
                    marginTop: '8px',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {isSubmitting && uploadTotal > 0 && (
          <div
            style={{
              padding: '20px',
              border: '1px solid #ddd',
              borderRadius: '12px',
              background: '#f8f8f8',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              <strong>Uploading product...</strong>

              <strong>{progress}%</strong>
            </div>

            <div
              style={{
                width: '100%',
                height: '12px',
                background: '#ddd',
                borderRadius: '20px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: '#111',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>

            <p
              style={{
                margin: '12px 0 4px',
                fontWeight: 600,
              }}
            >
              {uploadedCount} / {uploadTotal} pictures uploaded
            </p>

            <p
              style={{
                margin: 0,
                color: '#666',
                fontSize: '14px',
              }}
            >
              Please don&apos;t close or refresh this page while the
              upload is in progress.
            </p>
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: '#ffecec',
              color: '#b00020',
            }}
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: '#eaf7ea',
              color: '#176b17',
            }}
          >
            {successMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={
            isSubmitting ||
            isProcessingImages ||
            images.length === 0
          }
          style={{
            padding: '14px 20px',
            border: 'none',
            borderRadius: '9px',
            background:
              isSubmitting ||
              isProcessingImages ||
              images.length === 0
                ? '#999'
                : '#111',
            color: '#fff',
            fontWeight: 600,
            cursor:
              isSubmitting ||
              isProcessingImages ||
              images.length === 0
                ? 'not-allowed'
                : 'pointer',
          }}
        >
          {isProcessingImages
            ? 'Optimizing Pictures...'
            : isSubmitting
              ? 'Uploading...'
              : 'Add Fabric Product'}
        </button>
      </div>
    </form>
  );
}
