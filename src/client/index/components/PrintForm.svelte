<script lang="ts">
  import { appStore } from "../stores/appStore";

  // Props Interface
  interface Props {
    isOpen: boolean;
    onClose: () => void;
    // Image asset paths passed from Vite or parent component
    img2To1?: string;
    img1To2?: string;
    img2To2?: string;
    imgSorted?: string;
    imgStacked?: string;
    imgStapleSingleLeft?: string;
    imgStapleSingleRight?: string;
    imgStapleDoubleLeft?: string;
    imgStapleDoubleRight?: string;
    imgBooklet?: string;
    imgComb?: string;
    imgHoleLeft?: string;
    imgHoleRight?: string;
  }

  let {
    isOpen = false,
    onClose,
    img2To1 = '',
    img1To2 = '',
    img2To2 = '',
    imgSorted = '',
    imgStacked = '',
    imgStapleSingleLeft = '',
    imgStapleSingleRight = '',
    imgStapleDoubleLeft = '',
    imgStapleDoubleRight = '',
    imgBooklet = '',
    imgComb = '',
    imgHoleLeft = '',
    imgHoleRight = ''
  }: Props = $props();

  // Form State Runes ($state)
  let schoolLevel = $state('PS');
  let otherSchoolLevel = $state('');

  // Initialize from store
  let userEmail = $state($appStore.currentUserEmail || '');

  // Keep synced in case appStore populates asynchronously
  $effect(() => {
    if ($appStore.currentUserEmail) {
      userEmail = $appStore.currentUserEmail;
    }
  });

  let date = $state(new Date().toISOString().split('T')[0]);
  let numberOfCopies = $state(1);

  // File / Submission State
  let isDropOff = $state(false);

  // Staged Raw File State (Holds files up to 2GB+)
  let selectedFile = $state<File | null>(null);
  let isSubmitting = $state(false);
  let uploadProgress = $state(0);

  // Paper & Print Specs
  let paperWeight = $state('Regular');
  let paperSize = $state('8.5x11 (letter)');
  let paperColorType = $state('White');
  let paperColorDetails = $state('');
  let printType = $state('Black and White Print');
  let accountNumber = $state('');
  let administrator = $state('');
  let sidesDuplex = $state('Single Sided');
  let collation = $state('Sorted (collated)');

  // Cover Specs (Mapped to cover_sides, cover_weight, cover_color)
  let coverFront = $state(false);
  let coverBack = $state(false);
  let coverWeight = $state('Regular');
  let coverColor = $state('');

  // Finishing Specs
  let stapleOption = $state('None');
  let bindingType = $state('None');
  let bindingSide = $state('Left');
  let holePunch = $state('None');
  let lamination = $state(false);
  let cut = $state(false);
  let notes = $state('');

  function handleDropOffToggle(checked: boolean) {
    isDropOff = checked;
    if (isDropOff) {
      selectedFile = null;
    }
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      selectedFile = target.files[0];
    } else {
      selectedFile = null;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  /**
 * Performs a Google Drive Resumable Upload directly from the browser.
 * Streams raw binary data without Base64 overhead or RPC payload limits.
 */
async function uploadLargeFileToDrive(file: File): Promise<string> {
  // Check if running inside Google Apps Script environment
  if (typeof google === 'undefined' || !(google as any).script?.run) {
    console.warn('Dev Mode: Skipping actual Google Drive API upload.');
    // Return a dummy Drive URL for local testing
    return `https://drive.google.com/file/d/mock-dev-file-id/view`;
  }

  // 1. Get an authorized Resumable Upload Session URL from Apps Script
  const uploadUrl = await new Promise<string>((resolve, reject) => {
    (google.script as any).run
      .withSuccessHandler((url: string) => resolve(url))
      .withFailureHandler((err: any) => reject(err))
      .getDriveResumableUploadUrl(file.name, file.type, file.size);
  });

  // 2. Upload raw binary file to the session URL with progress monitoring
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        uploadProgress = Math.round((e.loaded / e.total) * 100);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        const response = JSON.parse(xhr.responseText);
        const driveFileUrl = `https://drive.google.com/file/d/${response.id}/view`;
        resolve(driveFileUrl);
      } else {
        reject(new Error(`Drive upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during file upload'));
    xhr.send(file);
  });
}

async function handleSubmit(e: Event) {
    e.preventDefault();
    isSubmitting = true;
    uploadProgress = 0;

    try {
      let finalFileUrl = '';

      // Upload staged file if not drop-off
      if (!isDropOff && selectedFile) {
        finalFileUrl = await uploadLargeFileToDrive(selectedFile);
      }

      const coverSidesVal = [
        coverFront ? 'Front' : '',
        coverBack ? 'Back' : ''
      ].filter(Boolean).join(' & ') || 'None';

      const payload = {
        teacher_email: userEmail,
        department: schoolLevel === 'Other' ? otherSchoolLevel : schoolLevel,
        priority: 'Standard',
        file_url: isDropOff ? 'Drop Off' : finalFileUrl,
        received: !isDropOff,

        copies: numberOfCopies,
        color: printType === 'Color Print',
        paper_size: paperSize,
        paper_weight: paperWeight,
        paper_color: paperColorType === 'Color Paper' ? paperColorDetails : 'White',
        sides: sidesDuplex,
        collation: collation === 'Sorted (collated)',

        cover_sides: coverSidesVal,
        cover_weight: coverWeight,
        cover_color: coverColor,

        staple: stapleOption,
        binding: bindingType !== 'None' ? `${bindingType} (${bindingSide})` : 'None',
        hole_punch: holePunch,
        lamination,
        cut,
        account_number: accountNumber,
        administrator,
        needed_by_date: date,
        user_notes: notes
      };

      let result: any;

      if (typeof google !== 'undefined' && (google as any).script?.run) {
        result = await new Promise((resolve, reject) => {
          (google as any).script.run
            .withSuccessHandler((res: any) => resolve(res))
            .withFailureHandler((err: any) => reject(err))
            .handlePrintFormSubmit(payload);
        });
      } else {
        console.warn('Dev Mode: Simulating handlePrintFormSubmit response.');
        result = { success: true, ticket_id: `DEV-${Math.floor(1000 + Math.random() * 9000)}` };
      }

      if (result && result.success) {
        alert(`Print job submitted successfully! Ticket ID: ${result.ticket_id}`);
        onClose();
      } else {
        alert(`Submission failed: ${result?.error || 'Unknown server error'}`);
      }
    } catch (err: any) {
      console.error('Error submitting print job:', err);
      alert('An error occurred during job submission.');
    } finally {
      isSubmitting = false;
      uploadProgress = 0;
    }
  }
</script>

{#if isOpen}
  <div 
    class="modal-backdrop" 
    onclick={onClose} 
    onkeydown={handleKeydown}
    role="button"
    tabindex="-1"
    aria-label="Close modal background"
  >
    <div 
      class="modal-container" 
      onclick={(e) => e.stopPropagation()} 
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabindex="0"
    >
      <div class="modal-header">
        <h3 id="modal-title">Create New Print Job</h3>
        <button type="button" class="close-btn" onclick={onClose} aria-label="Close modal">✕</button>
      </div>

      <form onsubmit={handleSubmit} class="modal-form">
        <!-- Top Warning Banner -->
        <div class="warning-banner">
          <h2>PLEASE</h2>
          <h3>NO STAPLES - NO WHITEOUT - NO GLUE - NO TAPE</h3>
        </div>

        <!-- Header Section -->
        <div class="header-section">
          <div class="level-checkboxes">
            {#each ['PS', 'LS', 'MS', 'US'] as level}
              <label class="inline-label">
                <input 
                  type="radio" 
                  name="schoolLevel" 
                  value={level} 
                  bind:group={schoolLevel} 
                />
                {level}
              </label>
            {/each}

            <label class="inline-label">
              <input 
                type="radio" 
                name="schoolLevel" 
                value="Other" 
                bind:group={schoolLevel} 
              />
              Other
            </label>
            {#if schoolLevel === 'Other'}
              <input 
                type="text" 
                class="line-input short-text" 
                placeholder="Specify level" 
                bind:value={otherSchoolLevel} 
              />
            {/if}
          </div>

          <div class="header-inputs">
            <label>
              Email
              <input type="email" class="line-input" bind:value={userEmail} readonly required />
            </label>

            <label>
              Date Needed
              <input type="date" class="line-input" bind:value={date} required />
            </label>

            <label>
              # Copies
              <input type="number" min="1" class="line-input short-number" bind:value={numberOfCopies} required />
            </label>
          </div>
        </div>

<!-- File Submission / Drop-Off Section -->
<div class="grid-box full-width-box border-spaced">
  <h4>File Submission Options</h4>
  <div class="submission-options-grid">
    <label class="checkbox-label highlight">
      <input 
        type="checkbox" 
        bind:checked={isDropOff}
        onchange={(e) => handleDropOffToggle(e.currentTarget.checked)} 
      />
      Physical Hard Copy Drop Off (No digital file upload)
    </label>

    {#if !isDropOff}
      <div class="file-upload-field">
        <div class="file-picker-row">
          <input 
            id="fileInput" 
            type="file" 
            class="hidden-file-input" 
            onchange={handleFileSelect} 
            disabled={isSubmitting}
            required={!isDropOff && !selectedFile}
          />
          
          <label for="fileInput" class="upload-btn {isSubmitting ? 'disabled' : ''}">
            📎 Choose File
          </label>

          {#if selectedFile}
            <span class="file-name-tag">
              {selectedFile?.name} ({((selectedFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB)
            </span>
          {:else}
            <span class="file-placeholder-text">No local file chosen</span>
          {/if}
        </div>

        {#if isSubmitting && uploadProgress > 0}
          <div class="progress-container">
            <div class="progress-bar" style="width: {uploadProgress}%"></div>
            <span class="progress-text">Uploading: {uploadProgress}%</span>
          </div>
        {/if}
      </div>
    {:else}
      <div class="info-banner">
        <p>Please deliver your physical document to the Print Center. Your job will be marked queued when received.</p>
      </div>
    {/if}
  </div>
</div>

        <!-- Main Grid: Top Row -->
        <div class="grid-row top-grid">
          <!-- Paper Type -->
          <div class="grid-box">
            <h4>Paper Type</h4>
            <div class="sub-grid-2col">
              <div class="col">
                <label><input type="radio" name="paperWeight" value="Regular" bind:group={paperWeight} /> Regular</label>
                <label><input type="radio" name="paperWeight" value="Cardstock" bind:group={paperWeight} /> Cardstock</label>
              </div>
              <div class="col">
                <label><input type="radio" name="paperSize" value="8.5x11 (letter)" bind:group={paperSize} /> 8.5x11 (letter)</label>
                <label><input type="radio" name="paperSize" value="8.5x14 (legal)" bind:group={paperSize} /> 8.5x14 (legal)</label>
                <label><input type="radio" name="paperSize" value="11x17 (tabloid)" bind:group={paperSize} /> 11x17 (tabloid)</label>
              </div>
            </div>

            <div class="color-paper-section">
              <label><input type="radio" name="paperColorType" value="White" bind:group={paperColorType} /> White</label>
              <div class="inline-field">
                <label><input type="radio" name="paperColorType" value="Color Paper" bind:group={paperColorType} /> Color Paper</label>
                <input 
                  type="text" 
                  class="line-input flex-input" 
                  placeholder="Color" 
                  disabled={paperColorType !== 'Color Paper'} 
                  bind:value={paperColorDetails} 
                />
              </div>
            </div>
          </div>

          <!-- Print Type -->
          <div class="grid-box">
            <h4>Print Type</h4>
            <div class="radio-group vertical">
              <label><input type="radio" name="printType" value="Black and White Print" bind:group={printType} /> Black and White Print</label>
              <label><input type="radio" name="printType" value="Color Print" bind:group={printType} /> Color Print</label>
            </div>

            <div class="field-inputs border-top-spaced">
              <label class="line-field">
                Account #
                <input type="text" class="line-input flex-input" bind:value={accountNumber} />
              </label>

              <label class="line-field">
                Administrator
                <input type="text" class="line-input flex-input" bind:value={administrator} />
              </label>
            </div>
          </div>

          <!-- Sides/Duplex -->
          <div class="grid-box">
            <h4>Sides/Duplex</h4>
            <div class="duplex-options">
              <label><input type="radio" name="sidesDuplex" value="Single Sided" bind:group={sidesDuplex} /> Single Sided</label>
              
              <label class="icon-label">
                <input type="radio" name="sidesDuplex" value="2 sided to 1 sided" bind:group={sidesDuplex} />
                <span>2 sided to 1 sided</span>
                {#if img2To1}<img src={img2To1} alt="2 sided to 1 sided" class="form-icon" />{/if}
              </label>

              <div class="section-subtitle">Double</div>

              <label class="icon-label">
                <input type="radio" name="sidesDuplex" value="1 sided to 2 sided" bind:group={sidesDuplex} />
                <span>1 sided to 2 sided</span>
                {#if img1To2}<img src={img1To2} alt="1 sided to 2 sided" class="form-icon" />{/if}
              </label>

              <label class="icon-label">
                <input type="radio" name="sidesDuplex" value="2 sided to 2 sided" bind:group={sidesDuplex} />
                <span>2 sided to 2 sided</span>
                {#if img2To2}<img src={img2To2} alt="2 sided to 2 sided" class="form-icon" />{/if}
              </label>
            </div>
          </div>

          <!-- Collation -->
          <div class="grid-box">
            <h4>Collation</h4>
            <div class="radio-group vertical">
              <label class="icon-label">
                <input type="radio" name="collation" value="Sorted (collated)" bind:group={collation} />
                <span>Sorted (collated)</span>
                {#if imgSorted}<img src={imgSorted} alt="Sorted" class="form-icon tall" />{/if}
              </label>

              <label class="icon-label">
                <input type="radio" name="collation" value="Stacked (uncollated)" bind:group={collation} />
                <span>Stacked (uncollated)</span>
                {#if imgStacked}<img src={imgStacked} alt="Stacked" class="form-icon tall" />{/if}
              </label>
            </div>
          </div>
        </div>

        <!-- Main Grid: Bottom Row -->
        <div class="grid-row bottom-grid">
          <!-- Cover Section (Updated with cover_sides, cover_weight, cover_color) -->
          <div class="grid-box">
            <h4>Cover</h4>
            <div class="sub-grid-2col">
              <div class="col">
                <label><input type="checkbox" bind:checked={coverFront} /> Front</label>
                <label><input type="checkbox" bind:checked={coverBack} /> Back</label>
              </div>
              <div class="col">
                <label><input type="radio" name="coverWeight" value="Regular" bind:group={coverWeight} /> Regular</label>
                <label><input type="radio" name="coverWeight" value="Cardstock" bind:group={coverWeight} /> Cardstock</label>
              </div>
            </div>

            <div class="inline-field spaced-top">
              <label for="coverColor">Paper color</label>
              <input id="coverColor" type="text" class="line-input flex-input" bind:value={coverColor} />
            </div>
          </div>

          <!-- Staples -->
          <div class="grid-box">
            <h4>Staples</h4>
            <div class="staple-grid">
              <div class="staple-col">
                <span class="sub-label">Single</span>
                <label class="icon-label compact">
                  <input type="radio" name="stapleOption" value="Single Left" bind:group={stapleOption} />
                  <span>Left</span>
                  {#if imgStapleSingleLeft}<img src={imgStapleSingleLeft} alt="Single staple left" class="form-icon" />{/if}
                </label>
                <label class="icon-label compact">
                  <input type="radio" name="stapleOption" value="Single Right" bind:group={stapleOption} />
                  <span>Right</span>
                  {#if imgStapleSingleRight}<img src={imgStapleSingleRight} alt="Single staple right" class="form-icon" />{/if}
                </label>
              </div>

              <div class="staple-col">
                <span class="sub-label">Double</span>
                <label class="icon-label compact">
                  <input type="radio" name="stapleOption" value="Double Left" bind:group={stapleOption} />
                  <span>Left</span>
                  {#if imgStapleDoubleLeft}<img src={imgStapleDoubleLeft} alt="Double staple left" class="form-icon" />{/if}
                </label>
                <label class="icon-label compact">
                  <input type="radio" name="stapleOption" value="Double Right" bind:group={stapleOption} />
                  <span>Right</span>
                  {#if imgStapleDoubleRight}<img src={imgStapleDoubleRight} alt="Double staple right" class="form-icon" />{/if}
                </label>
              </div>
            </div>

            <div class="saddle-option">
              <label class="icon-label">
                <input type="radio" name="stapleOption" value="Booklet (saddle)" bind:group={stapleOption} /> 
                <span>Booklet (saddle)</span>
                {#if imgBooklet}<img src={imgBooklet} alt="Booklet" class="form-icon" />{/if}
              </label>
            </div>
          </div>

          <!-- Binding -->
          <div class="grid-box">
            <h4>Binding</h4>
            <div class="field-section">
              <span class="sub-label">Type</span>
              <label class="icon-label">
                <input type="radio" name="bindingType" value="Comb" bind:group={bindingType} /> 
                <span>Comb</span>
                {#if imgComb}<img src={imgComb} alt="Comb binding" class="form-icon" />{/if}
              </label>
              <label><input type="radio" name="bindingType" value="None" bind:group={bindingType} /> None</label>
            </div>

            {#if bindingType !== 'None'}
              <div class="field-section spaced-top">
                <span class="sub-label">Side</span>
                <div class="inline-group">
                  <label><input type="radio" name="bindingSide" value="Left" bind:group={bindingSide} /> Left</label>
                  <label><input type="radio" name="bindingSide" value="Right" bind:group={bindingSide} /> Right</label>
                  <label><input type="radio" name="bindingSide" value="Top" bind:group={bindingSide} /> Top</label>
                </div>
              </div>
            {/if}
          </div>

          <!-- Hole Punch -->
          <div class="grid-box">
            <h4>Hole Punch</h4>
            <div class="radio-group vertical">
              <label class="icon-label">
                <input type="radio" name="holePunch" value="Left" bind:group={holePunch} />
                <span>Left</span>
                {#if imgHoleLeft}<img src={imgHoleLeft} alt="Hole punch left" class="form-icon" />{/if}
              </label>
              <label class="icon-label">
                <input type="radio" name="holePunch" value="Right" bind:group={holePunch} />
                <span>Right</span>
                {#if imgHoleRight}<img src={imgHoleRight} alt="Hole punch right" class="form-icon" />{/if}
              </label>
              <label><input type="radio" name="holePunch" value="None" bind:group={holePunch} /> None</label>
            </div>
          </div>

          <!-- Special Finishing -->
          <div class="grid-box flex-column">
            <h4>Special Finishing</h4>
            <div class="finishing-options">
              <label><input type="checkbox" bind:checked={lamination} /> Lamination</label>
              <label><input type="checkbox" bind:checked={cut} /> Cut</label>
            </div>
          </div>
        </div>

        <!-- Notes Section -->
        <div class="notes-section">
          <label for="notes">Notes:</label>
          <textarea id="notes" rows="2" bind:value={notes}></textarea>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn secondary" onclick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="submit" class="btn primary" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Save Job'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  /* Modal Overlay Styling */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
  }

  .modal-container {
    width: 90vw;
    max-width: 1100px;
    height: 92vh;
    background: #FFFFFF;
    border-radius: 8px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    background-color: #001F3F;
    color: #FFFFFF;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    color: #FFFFFF;
  }

  .close-btn:hover {
    color: #FF851B;
  }

  .modal-form {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    overflow-y: auto;
    flex: 1;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #111;
  }

  /* Form Internal Layout */
  .warning-banner {
    text-align: center;
  }

  .warning-banner h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: 1px;
  }

  .warning-banner h3 {
    margin: 2px 0 0 0;
    font-size: 0.95rem;
    font-weight: 800;
    letter-spacing: 0.5px;
  }

  .header-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .level-checkboxes {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .header-inputs {
    display: flex;
    gap: 24px;
    align-items: flex-end;
    flex-wrap: wrap;
  }

  .header-inputs label {
    font-weight: bold;
    display: flex;
    align-items: flex-end;
    gap: 8px;
  }

  /* Grid Layouts */
  .grid-row {
    display: grid;
    border: 2px solid #000;
  }

  .top-grid {
    grid-template-columns: 1.2fr 1.2fr 1fr 1fr;
    border-bottom: none;
  }

  .bottom-grid {
    grid-template-columns: 1.2fr 1.2fr 1fr 0.8fr 0.8fr;
  }

  .grid-box {
    border-right: 1px solid #000;
    padding: 8px 10px;
    box-sizing: border-box;
  }

  .grid-box:last-child {
    border-right: none;
  }

  .grid-box h4 {
    margin: 0 0 8px 0;
    font-size: 0.95rem;
    font-weight: bold;
    border-bottom: 1px solid #ddd;
    padding-bottom: 2px;
  }

  /* Form Elements */
  label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    cursor: pointer;
  }

  .inline-label {
    display: inline-flex;
  }

  .radio-group.vertical {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .sub-grid-2col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .col {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .line-input {
    border: none;
    border-bottom: 1px solid #000;
    outline: none;
    padding: 2px 4px;
    font-size: 0.85rem;
  }

  .line-input:focus {
    border-bottom-color: #001F3F;
  }

  .flex-input {
    flex: 1;
    width: 100%;
  }

  .short-text {
    width: 100px;
  }

  .short-number {
    width: 60px;
  }

  .inline-field {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .line-field {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }

  .color-paper-section {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .border-top-spaced {
    border-top: 1px dashed #ccc;
    padding-top: 8px;
    margin-top: 8px;
  }

  .duplex-options {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .section-subtitle {
    font-weight: bold;
    font-size: 0.8rem;
    margin-top: 4px;
  }

.icon-label {
    display: inline-flex;
    align-items: center;
    gap: 8px; /* Controls the spacing between text and icon */
    cursor: pointer;
  }

  .icon-label.compact {
    gap: 6px;
  }

  /* Image Icon Styling */
  .form-icon {
    height: 22px;
    width: auto;
    object-fit: contain;
    margin-left: 0; /* Removes auto margin that pushed icons to the far right */
  }

  .form-icon.tall {
    height: 28px;
  }

  .staple-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .staple-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sub-label {
    font-weight: bold;
    font-size: 0.8rem;
    color: #444;
  }

  .saddle-option {
    margin-top: 8px;
    padding-top: 4px;
    border-top: 1px dashed #ccc;
  }

  .field-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .inline-group {
    display: flex;
    gap: 6px;
  }

  .spaced-top {
    margin-top: 8px;
  }

  .flex-column {
    display: flex;
    flex-direction: column;
  }

  .finishing-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
  }

  .notes-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .notes-section label {
    font-weight: bold;
  }

  textarea {
    width: 100%;
    border: 1px solid #000;
    padding: 6px;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
  }

  /* Actions Footer */
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
    margin-top: auto;
  }

  .btn {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn.primary {
    background-color: #FF851B;
    color: #FFFFFF;
  }

  .btn.primary:hover {
    opacity: 0.9;
  }

  .btn.secondary {
    background-color: #f3f4f6;
    color: #333333;
  }

  .btn.secondary:hover {
    background-color: #e5e7eb;
  }

  @media (max-width: 850px) {
    .top-grid, .bottom-grid {
      grid-template-columns: 1fr;
    }
    .grid-box {
      border-right: none;
      border-bottom: 1px solid #000;
    }
  }
</style>