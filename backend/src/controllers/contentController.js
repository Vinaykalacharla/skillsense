const path = require('path');
const fs = require('fs');
const asyncHandler = require('express-async-handler');
const ContentBlock = require('../models/contentBlockModel');

const contentPath = path.join(__dirname, '..', '..', 'data', 'contentBlocks.json');

const loadDefaultContent = () => {
  try {
    const contents = fs.readFileSync(contentPath, 'utf8');
    return JSON.parse(contents.replace(/^\uFEFF/, ''));
  } catch (error) {
    return {};
  }
};

const syncContentBlocksFromDefaults = async () => {
  const defaults = loadDefaultContent();
  const entries = Object.entries(defaults);

  if (!entries.length) {
    return;
  }

  await Promise.all(
    entries.map(([key, payload]) =>
      ContentBlock.findOneAndUpdate(
        { key },
        { key, payload },
        {
          upsert: true,
          setDefaultsOnInsert: true,
          returnDocument: 'after',
        },
      ),
    ),
  );
};

const landingContent = asyncHandler(async (req, res) => {
  await syncContentBlocksFromDefaults();
  const blocks = await ContentBlock.find();
  const payload = {};
  blocks.forEach((block) => {
    payload[block.key] = block.payload;
  });
  res.json(payload);
});

module.exports = {
  landingContent,
};
