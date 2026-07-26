-- ENTRAL deterministic canonical hierarchy seed.
-- Requires repository migrations 040-045. Safe to rerun only when existing canonical stable codes use the same deterministic IDs.
BEGIN;
SET LOCAL search_path = entral, public;
SELECT set_config('app.actor_kind', 'SYSTEM', true);
SELECT set_config('app.action_reason', 'Install canonical ENTRAL taxonomy edition 1.0', true);
SELECT pg_advisory_xact_lock(
    hashtextextended('entral:canonical-taxonomy:1.0.0', 0)
);

UPDATE taxonomy_versions
SET is_active = false
WHERE is_active
  AND id <> 'd10d945f-fdde-5cb2-aee5-7be737fa52f1'::uuid;

INSERT INTO taxonomy_versions(
    id, name, semantic_version, source_edition, source_sha256, is_active, metadata
) VALUES (
    'd10d945f-fdde-5cb2-aee5-7be737fa52f1'::uuid,
    'ENTRAL Canonical Commerce Taxonomy',
    '1.0.0',
    'Canonical edition 1.0 | 21 July 2026',
    '{"ENTRAL-Commerce-Agent-Command-Architecture.docx":"acf38f33d2eee763131e35a14a2c55e9819d3bd7aea827002796000254680b2f","ENTRAL-Fable5-GPT56Sol-Ultra-Build-Directive.docx":"082d372062d70a60418e5121989a41b021486c372c74e367e223f5116a5fbda0","ENTRAL-UI-Simplification-and-Autonomous-Control-Directive.docx":"f4024499a3e5ec0223e4af3bfe165f24ca8c3dc56077b9d938e2e2845a461b48"}'::jsonb,
    true,
    '{"expected_counts":{"entral":1,"marshals":8,"generals":123}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    semantic_version = EXCLUDED.semantic_version,
    source_edition = EXCLUDED.source_edition,
    source_sha256 = EXCLUDED.source_sha256,
    is_active = true,
    metadata = EXCLUDED.metadata
WHERE (
    taxonomy_versions.name,
    taxonomy_versions.semantic_version,
    taxonomy_versions.source_edition,
    taxonomy_versions.source_sha256,
    taxonomy_versions.is_active,
    taxonomy_versions.metadata
) IS DISTINCT FROM (
    EXCLUDED.name,
    EXCLUDED.semantic_version,
    EXCLUDED.source_edition,
    EXCLUDED.source_sha256,
    true,
    EXCLUDED.metadata
);

CREATE TEMP TABLE canonical_seed_stage (
    id uuid PRIMARY KEY,
    stable_code text NOT NULL UNIQUE,
    role entity_role NOT NULL,
    name text NOT NULL,
    parent_id uuid,
    definition text
) ON COMMIT DROP;

INSERT INTO canonical_seed_stage(id, stable_code, role, name, parent_id, definition)
VALUES
    ('45638366-d6f0-5b27-91bf-d2362df27922'::uuid, 'ENTRAL', 'ENTRAL'::entity_role, 'ENTRAL', NULL::uuid, 'Single governing intelligence and central command layer.'),
    ('39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'M01', 'MARSHAL'::entity_role, 'Product and Fulfillment Marshal', '45638366-d6f0-5b27-91bf-d2362df27922'::uuid, 'Controls how products are sourced, produced, customized, stocked, fulfilled, recovered, and delivered.'),
    ('a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid, 'M02', 'MARSHAL'::entity_role, 'Digital and Software Marshal', '45638366-d6f0-5b27-91bf-d2362df27922'::uuid, 'Controls software, data, digital content, access products, licensing, and technology-enabled delivery.'),
    ('9a3057ec-2521-51bf-9733-1d3f405d5644'::uuid, 'M03', 'MARSHAL'::entity_role, 'Marketplace Marshal', '45638366-d6f0-5b27-91bf-d2362df27922'::uuid, 'Controls businesses that connect multiple participant groups and govern discovery, matching, trust, transactions, and marketplace liquidity.'),
    ('4989cabf-3ffc-5ace-9292-a68abd67c686'::uuid, 'M04', 'MARSHAL'::entity_role, 'Customer-Relationship Marshal', '45638366-d6f0-5b27-91bf-d2362df27922'::uuid, 'Controls buyer and seller identity, contract structure, buying process, account ownership, and relationship economics.'),
    ('2bd9ea7f-41ec-5bb1-8bfd-a24c2c4ff416'::uuid, 'M05', 'MARSHAL'::entity_role, 'Revenue Marshal', '45638366-d6f0-5b27-91bf-d2362df27922'::uuid, 'Controls how value is priced, charged, collected, shared, renewed, and measured across businesses.'),
    ('e578ba43-f528-5a41-a7f6-6d736bb638a9'::uuid, 'M06', 'MARSHAL'::entity_role, 'Service-Based E-Commerce Marshal', '45638366-d6f0-5b27-91bf-d2362df27922'::uuid, 'Controls the sale, scheduling, delivery, quality, and fulfillment of services through digital commerce systems.'),
    ('4e396ffd-a01b-5719-860b-6232d96b0d36'::uuid, 'M07', 'MARSHAL'::entity_role, 'Sales-Channel Marshal', '45638366-d6f0-5b27-91bf-d2362df27922'::uuid, 'Controls where and how customers discover, evaluate, buy, and receive offers across channels and interfaces.'),
    ('22c8d3e1-65e9-5cc1-b574-2bc11c24ef84'::uuid, 'M08', 'MARSHAL'::entity_role, 'Specialized Commerce Marshal', '45638366-d6f0-5b27-91bf-d2362df27922'::uuid, 'Controls specialized commercial formats whose operating mechanics, customer expectations, or mission require distinct governance.'),
    ('39ed11de-7346-5cb0-b06c-751d7f306bad'::uuid, 'G-M01-01', 'GENERAL'::entity_role, 'Dropshipping General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Supplier-held inventory is sold by the business and shipped directly to the customer.'),
    ('d11cf902-1ca3-532d-9651-1503b369afd7'::uuid, 'G-M01-02', 'GENERAL'::entity_role, 'Print-on-Demand General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Products are produced and fulfilled after purchase using customer-selected or brand-created designs.'),
    ('593cc117-5a6b-532d-8064-cbff3be3f2bd'::uuid, 'G-M01-03', 'GENERAL'::entity_role, 'Private Label General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Contract-manufactured products are sold under a proprietary brand with controlled positioning and specifications.'),
    ('1beae897-cbda-57ee-8efc-ab1f1f2f6056'::uuid, 'G-M01-04', 'GENERAL'::entity_role, 'White Label General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Existing products are rebranded for resale with limited changes to the underlying product.'),
    ('ff00a1a4-9392-594e-8cdf-4061afb8ef8f'::uuid, 'G-M01-05', 'GENERAL'::entity_role, 'Wholesale General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Goods are bought or sold in bulk, typically with account-based pricing and distribution operations.'),
    ('4f81e756-ec81-51a7-89e9-3fa57e3bf413'::uuid, 'G-M01-06', 'GENERAL'::entity_role, 'Direct-to-Consumer General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'A brand sells directly to end customers without relying on traditional retail intermediaries.'),
    ('e99bfc34-34a3-53e1-aeb3-c023658d84bc'::uuid, 'G-M01-07', 'GENERAL'::entity_role, 'Manufacturing General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'The business controls in-house or contracted production, quality, capacity, and supply planning.'),
    ('a9b0fb7d-1c91-5b28-b908-32adfda43fc4'::uuid, 'G-M01-08', 'GENERAL'::entity_role, 'Handmade General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Artisan or craft products are produced manually in small batches or as individual pieces.'),
    ('be810cca-d054-5ab0-ba11-ea2ba880b917'::uuid, 'G-M01-09', 'GENERAL'::entity_role, 'Made-to-Order General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Production starts only after an order is confirmed, reducing finished-goods inventory.'),
    ('4d1ed6f6-063e-52f8-95a5-84436a5b43a2'::uuid, 'G-M01-10', 'GENERAL'::entity_role, 'Retail Arbitrage General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Discounted products are sourced from physical retail locations and resold at a margin.'),
    ('35e12b7f-9a8d-584e-82b5-19fe48de469c'::uuid, 'G-M01-11', 'GENERAL'::entity_role, 'Online Arbitrage General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Discounted products are sourced online and resold through another channel or marketplace.'),
    ('3dfd17bb-21c3-5a99-bbcf-3466740524d9'::uuid, 'G-M01-12', 'GENERAL'::entity_role, 'Liquidation Resale General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Overstock, returns, closeouts, and distressed inventory are acquired and resold.'),
    ('2dbba35d-4088-5b4d-bbca-b2417a861dad'::uuid, 'G-M01-13', 'GENERAL'::entity_role, 'Refurbished Goods General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Used or defective goods are restored, tested, graded, warranted, and resold.'),
    ('c95808fe-23a6-506a-b71f-b4f918d0adbf'::uuid, 'G-M01-14', 'GENERAL'::entity_role, 'Recommerce General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Previously owned products are acquired, listed, authenticated where needed, and resold.'),
    ('2b27f1c7-01d1-5d95-bdf0-05f085ae1de5'::uuid, 'G-M01-15', 'GENERAL'::entity_role, 'Consignment General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Products are sold on behalf of owners, with proceeds divided under an agreed revenue share.'),
    ('b097d11b-0756-5da6-a290-bc35bd55b9ca'::uuid, 'G-M01-16', 'GENERAL'::entity_role, 'Subscription Boxes General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Curated physical products are assembled and delivered on a recurring schedule.'),
    ('ea24a900-948e-5ee7-a88e-da69fd72b3a4'::uuid, 'G-M01-17', 'GENERAL'::entity_role, 'Rental Commerce General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Customers pay for temporary access to physical products while the business retains ownership.'),
    ('0c105905-0f1a-5656-856c-0d0e2185161e'::uuid, 'G-M01-18', 'GENERAL'::entity_role, 'Preorder Commerce General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Orders and often payment are accepted before inventory or production is ready.'),
    ('49811bf7-7cbc-54f0-9077-5c1a2b1b7f5d'::uuid, 'G-M01-19', 'GENERAL'::entity_role, 'Crowdfunding Commerce General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Demand and funding are secured through campaign-backed commitments before full-scale delivery.'),
    ('a2d262af-5215-5796-9bfb-081a4e028138'::uuid, 'G-M01-20', 'GENERAL'::entity_role, 'Digital Downloads General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Files are sold and delivered electronically with no physical fulfillment requirement.'),
    ('46399e06-4429-57f7-acfc-d6429ed3b2cb'::uuid, 'G-M01-21', 'GENERAL'::entity_role, 'Personalized Products General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Standard products are tailored with customer-specific names, images, dates, or selections.'),
    ('dc6b463f-b70f-5ec4-b981-d79c2903fe2a'::uuid, 'G-M01-22', 'GENERAL'::entity_role, 'Custom Products General', '39ba1ebb-f916-5115-937a-225419f42175'::uuid, 'Products are designed or manufactured to unique customer specifications beyond standard personalization.'),
    ('4692c0b3-0cb0-5d04-a39e-a6a504fa4c8b'::uuid, 'G-M02-01', 'GENERAL'::entity_role, 'SaaS General', 'a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid, 'Subscription or contract access to centrally hosted software delivered over the internet.'),
    ('e375be99-e71c-580e-9006-8d7a22e77484'::uuid, 'G-M02-02', 'GENERAL'::entity_role, 'Micro-SaaS General', 'a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid, 'A narrowly scoped software product serving a specific workflow, audience, or integration need.'),
    ('6d76cd00-b5f1-57f9-a4cd-c9d199976ce3'::uuid, 'G-M02-03', 'GENERAL'::entity_role, 'Platform-as-a-Service General', 'a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid, 'Hosted infrastructure and development capabilities are provided for building and deploying applications.'),
    ('c31b6bd1-dd31-575a-a19e-6ec7e6eb11a8'::uuid, 'G-M02-04', 'GENERAL'::entity_role, 'API-as-a-Service General', 'a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid, 'Programmatic capabilities are packaged and monetized through documented application interfaces.'),
    ('36f66c3f-bdda-50f7-9a97-c207c535bef6'::uuid, 'G-M02-05', 'GENERAL'::entity_role, 'Data-as-a-Service General', 'a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid, 'Curated, processed, or continuously updated data is delivered through files, dashboards, or APIs.'),
    ('8980afd2-d2a4-5ef7-9b84-1bf709b8ca7b'::uuid, 'G-M02-06', 'GENERAL'::entity_role, 'Mobile App Commerce General', 'a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid, 'Products, services, or paid functionality are sold primarily through a mobile application.'),
    ('9ce85809-e772-5a8f-be8d-34e01a9448a8'::uuid, 'G-M02-07', 'GENERAL'::entity_role, 'Digital Products General', 'a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid, 'Non-physical assets such as guides, systems, media, datasets, or files are sold electronically.'),
    ('40b25aec-3865-548e-8477-27ebb06f83b3'::uuid, 'G-M02-08', 'GENERAL'::entity_role, 'Online Courses General', 'a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid, 'Structured educational content, exercises, assessments, and support are sold online.'),
    ('91205125-b03a-5154-beb9-ba41a0d1aa7c'::uuid, 'G-M02-09', 'GENERAL'::entity_role, 'Digital Memberships General', 'a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid, 'Recurring paid access is granted to digital resources, benefits, tools, or content libraries.'),
    ('5888a6e9-1112-5ce6-a73b-a95e6f2531db'::uuid, 'G-M02-10', 'GENERAL'::entity_role, 'Paid Communities General', 'a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid, 'Members pay for access to a moderated network, peer interaction, events, and shared resources.'),
    ('7c88c285-f683-5a20-a709-97283b829824'::uuid, 'G-M02-11', 'GENERAL'::entity_role, 'Paid Newsletters General', 'a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid, 'Subscribers pay for recurring written analysis, reporting, curation, or specialized insight.'),
    ('b4f888db-a9cc-5b9c-a88b-9df3a41cb967'::uuid, 'G-M02-12', 'GENERAL'::entity_role, 'Software Licensing General', 'a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid, 'Software usage rights are sold under defined terms, seats, devices, territories, or time periods.'),
    ('76c43e34-1229-5b68-8803-7a780f60c76b'::uuid, 'G-M02-13', 'GENERAL'::entity_role, 'Template Stores General', 'a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid, 'Reusable documents, designs, workflows, prompts, or system templates are sold digitally.'),
    ('cd8df3d2-3bd0-587c-b6b2-22b2547d6c1b'::uuid, 'G-M02-14', 'GENERAL'::entity_role, 'Stock-Asset Stores General', 'a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid, 'Licensed photos, video, audio, graphics, fonts, or similar creative assets are sold from a catalog.'),
    ('100f2949-1510-5d8e-8969-065e7bfef55c'::uuid, 'G-M02-15', 'GENERAL'::entity_role, 'Game-Asset Stores General', 'a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid, 'Game-ready models, textures, code, audio, maps, or systems are sold to developers.'),
    ('b1d18f0f-dcfc-51ad-a2a1-edb448d15513'::uuid, 'G-M02-16', 'GENERAL'::entity_role, 'Plugin Stores General', 'a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid, 'Extensions, add-ons, integrations, themes, or modules are sold for host platforms.'),
    ('4ab1fa18-9445-5edb-a4b2-c3d88a516e4a'::uuid, 'G-M02-17', 'GENERAL'::entity_role, 'AI-as-a-Service General', 'a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid, 'AI capabilities are delivered as hosted applications, agents, workflows, models, or APIs.'),
    ('c6b5f301-cb53-531d-b829-51aaecf0213e'::uuid, 'G-M03-01', 'GENERAL'::entity_role, 'Online Marketplace General', '9a3057ec-2521-51bf-9733-1d3f405d5644'::uuid, 'A digital venue connects buyers and sellers and supports discovery and transactions.'),
    ('85e45783-5ad8-5d83-8215-a68179e15a17'::uuid, 'G-M03-02', 'GENERAL'::entity_role, 'Multi-Vendor Marketplace General', '9a3057ec-2521-51bf-9733-1d3f405d5644'::uuid, 'Multiple independent vendors operate storefronts or catalogs within one platform.'),
    ('0d87ce31-37c4-5398-a23f-7fab30f8f004'::uuid, 'G-M03-03', 'GENERAL'::entity_role, 'Managed Marketplace General', '9a3057ec-2521-51bf-9733-1d3f405d5644'::uuid, 'The platform actively controls quality, fulfillment, pricing, matching, or service standards.'),
    ('d0657e39-f754-5365-b1f9-60e72de36191'::uuid, 'G-M03-04', 'GENERAL'::entity_role, 'Peer-to-Peer Marketplace General', '9a3057ec-2521-51bf-9733-1d3f405d5644'::uuid, 'Individuals transact directly with other individuals through platform-provided trust and payment systems.'),
    ('8ec7c57d-a0aa-5129-81a7-3ef5f628525d'::uuid, 'G-M03-05', 'GENERAL'::entity_role, 'Service Marketplace General', '9a3057ec-2521-51bf-9733-1d3f405d5644'::uuid, 'Customers discover, compare, book, and pay independent service providers.'),
    ('da5de0dd-b427-5ab4-8fb2-ca11204498dc'::uuid, 'G-M03-06', 'GENERAL'::entity_role, 'Freelancer Marketplace General', '9a3057ec-2521-51bf-9733-1d3f405d5644'::uuid, 'Businesses or individuals source and contract independent professional talent.'),
    ('46c69a46-df3b-5bf0-9cb4-ff81e5b97563'::uuid, 'G-M03-07', 'GENERAL'::entity_role, 'Rental Marketplace General', '9a3057ec-2521-51bf-9733-1d3f405d5644'::uuid, 'Owners list assets for temporary use by renters while the platform manages matching and trust.'),
    ('4b087c67-c016-51d4-bc90-d9d8ed6015e1'::uuid, 'G-M03-08', 'GENERAL'::entity_role, 'Auction Marketplace General', '9a3057ec-2521-51bf-9733-1d3f405d5644'::uuid, 'Sellers accept competing bids and the highest qualifying bid wins under defined rules.'),
    ('bd7a159f-f6da-564e-ad38-cb8d27073796'::uuid, 'G-M03-09', 'GENERAL'::entity_role, 'Reverse-Auction Marketplace General', '9a3057ec-2521-51bf-9733-1d3f405d5644'::uuid, 'Buyers post demand and suppliers compete by offering lower prices or stronger terms.'),
    ('e85c793b-60f4-576b-b47c-21490795e66a'::uuid, 'G-M03-10', 'GENERAL'::entity_role, 'Classified Marketplace General', '9a3057ec-2521-51bf-9733-1d3f405d5644'::uuid, 'Users publish listings and negotiate transactions, often with limited platform involvement.'),
    ('d5f34805-2b3e-50d1-83a0-0d7d6b1a62e0'::uuid, 'G-M03-11', 'GENERAL'::entity_role, 'Wholesale Marketplace General', '9a3057ec-2521-51bf-9733-1d3f405d5644'::uuid, 'Business buyers and suppliers transact in bulk with trade pricing, terms, and account controls.'),
    ('1db9d930-672a-516e-905e-1f3d63421e0c'::uuid, 'G-M03-12', 'GENERAL'::entity_role, 'Digital-Product Marketplace General', '9a3057ec-2521-51bf-9733-1d3f405d5644'::uuid, 'Multiple creators or vendors sell downloadable or access-based digital products.'),
    ('2e2cb6d4-4c1a-5a8b-9d95-06c7dc70a51a'::uuid, 'G-M03-13', 'GENERAL'::entity_role, 'Aggregator General', '9a3057ec-2521-51bf-9733-1d3f405d5644'::uuid, 'Offers from multiple providers are collected and presented through a unified discovery or purchasing layer.'),
    ('e3dce996-3d70-5b18-9d36-d33fbaa15e3b'::uuid, 'G-M03-14', 'GENERAL'::entity_role, 'Comparison Marketplace General', '9a3057ec-2521-51bf-9733-1d3f405d5644'::uuid, 'Alternatives are normalized and compared by price, features, availability, or suitability.'),
    ('a1776dd6-627d-5fdf-a220-e4236290c2f0'::uuid, 'G-M03-15', 'GENERAL'::entity_role, 'Two-Sided Marketplace General', '9a3057ec-2521-51bf-9733-1d3f405d5644'::uuid, 'The business creates value by attracting, matching, and retaining two interdependent participant groups.'),
    ('55b61c3b-46ea-5ca0-ba03-f6e11fd1da06'::uuid, 'G-M04-01', 'GENERAL'::entity_role, 'B2C General', '4989cabf-3ffc-5ace-9292-a68abd67c686'::uuid, 'Businesses sell products or services directly to individual consumers.'),
    ('2cc6f532-bee3-543a-83c9-20d232d62612'::uuid, 'G-M04-02', 'GENERAL'::entity_role, 'B2B General', '4989cabf-3ffc-5ace-9292-a68abd67c686'::uuid, 'Businesses sell to other businesses through accounts, contracts, procurement, or repeat commercial relationships.'),
    ('c26b5827-dbff-56dd-a26b-f0cec4670326'::uuid, 'G-M04-03', 'GENERAL'::entity_role, 'C2C General', '4989cabf-3ffc-5ace-9292-a68abd67c686'::uuid, 'Consumers sell or exchange value with other consumers, usually through a facilitating platform.'),
    ('f3227cf9-662c-5fac-bf14-80889b3374e0'::uuid, 'G-M04-04', 'GENERAL'::entity_role, 'C2B General', '4989cabf-3ffc-5ace-9292-a68abd67c686'::uuid, 'Individuals provide products, services, data, influence, or value to businesses.'),
    ('b048ed87-33e4-52aa-ac7c-16a9b4429c92'::uuid, 'G-M04-05', 'GENERAL'::entity_role, 'D2C General', '4989cabf-3ffc-5ace-9292-a68abd67c686'::uuid, 'Brands own the direct relationship, transaction, and customer data for end-consumer sales.'),
    ('b636144f-886b-507a-88d2-62a6c372388f'::uuid, 'G-M04-06', 'GENERAL'::entity_role, 'B2G General', '4989cabf-3ffc-5ace-9292-a68abd67c686'::uuid, 'Businesses sell to government entities under public procurement, compliance, and contracting requirements.'),
    ('70c5cb57-45e6-58a7-94b4-0a5e1d459902'::uuid, 'G-M04-07', 'GENERAL'::entity_role, 'G2B General', '4989cabf-3ffc-5ace-9292-a68abd67c686'::uuid, 'Government entities deliver paid or transactional services, licenses, data, or resources to businesses.'),
    ('eb3e670e-dfbd-516e-aa5d-c9d32817dc10'::uuid, 'G-M04-08', 'GENERAL'::entity_role, 'B2B2C General', '4989cabf-3ffc-5ace-9292-a68abd67c686'::uuid, 'One business reaches end consumers through another business while responsibilities and economics are shared.'),
    ('981d8f91-1d08-577c-9d8b-da27ed2d7d59'::uuid, 'G-M04-09', 'GENERAL'::entity_role, 'Peer-to-Peer General', '4989cabf-3ffc-5ace-9292-a68abd67c686'::uuid, 'Participants of comparable standing exchange value directly under a trust or coordination system.'),
    ('988e87cc-9f93-5746-ba31-f131daae6068'::uuid, 'G-M04-10', 'GENERAL'::entity_role, 'Enterprise E-Commerce General', '4989cabf-3ffc-5ace-9292-a68abd67c686'::uuid, 'Complex organizations buy through negotiated contracts, approvals, integrations, security, and account controls.'),
    ('6583583b-9b3e-5a48-bdc7-21cda91f97f7'::uuid, 'G-M05-01', 'GENERAL'::entity_role, 'One-Time Purchase General', '2bd9ea7f-41ec-5bb1-8bfd-a24c2c4ff416'::uuid, 'The customer pays once for a product, service, entitlement, or completed transaction.'),
    ('6585496a-dbbb-53f6-b36b-f5ceeb75b3d3'::uuid, 'G-M05-02', 'GENERAL'::entity_role, 'Subscription Commerce General', '2bd9ea7f-41ec-5bb1-8bfd-a24c2c4ff416'::uuid, 'Customers pay on a recurring schedule for continued products, access, or service.'),
    ('c8cbb18b-e8a4-5de5-9da9-ee6c24dab1c2'::uuid, 'G-M05-03', 'GENERAL'::entity_role, 'Membership Commerce General', '2bd9ea7f-41ec-5bb1-8bfd-a24c2c4ff416'::uuid, 'Recurring payment grants status, privileges, benefits, community access, or preferred economics.'),
    ('c73a654b-55ba-5d2c-9790-885dc4b38582'::uuid, 'G-M05-04', 'GENERAL'::entity_role, 'Freemium General', '2bd9ea7f-41ec-5bb1-8bfd-a24c2c4ff416'::uuid, 'A free core offer drives adoption while premium capabilities or limits generate revenue.'),
    ('0d655616-8137-5ff4-a859-993753a8d2f9'::uuid, 'G-M05-05', 'GENERAL'::entity_role, 'Usage-Based Pricing General', '2bd9ea7f-41ec-5bb1-8bfd-a24c2c4ff416'::uuid, 'Charges vary according to metered consumption such as volume, time, calls, storage, or output.'),
    ('c9a88776-9248-5ebc-8a24-06f8dd478810'::uuid, 'G-M05-06', 'GENERAL'::entity_role, 'Transaction-Fee Model General', '2bd9ea7f-41ec-5bb1-8bfd-a24c2c4ff416'::uuid, 'A fee is charged for each processed transaction or payment event.'),
    ('7d260532-be23-536f-94e3-4f36f8c2750b'::uuid, 'G-M05-07', 'GENERAL'::entity_role, 'Commission Model General', '2bd9ea7f-41ec-5bb1-8bfd-a24c2c4ff416'::uuid, 'Revenue is earned as a percentage or share of another party''s sale.'),
    ('f53f18aa-f67a-5a23-a6d7-17d00ea26f96'::uuid, 'G-M05-08', 'GENERAL'::entity_role, 'Licensing Model General', '2bd9ea7f-41ec-5bb1-8bfd-a24c2c4ff416'::uuid, 'Customers pay for defined rights to use intellectual property, software, content, or technology.'),
    ('52132df5-e6c1-5c42-9c16-754bb567bad6'::uuid, 'G-M05-09', 'GENERAL'::entity_role, 'Affiliate Commerce General', '2bd9ea7f-41ec-5bb1-8bfd-a24c2c4ff416'::uuid, 'Revenue is earned for attributable referrals that result in qualified actions or purchases.'),
    ('dbc1cb12-92ef-5c5f-96a9-31ffdec77efc'::uuid, 'G-M05-10', 'GENERAL'::entity_role, 'Advertising-Supported Commerce General', '2bd9ea7f-41ec-5bb1-8bfd-a24c2c4ff416'::uuid, 'User attention or inventory is monetized through paid advertising placements.'),
    ('cb1b3dea-878e-5912-9416-2f6e91054e64'::uuid, 'G-M05-11', 'GENERAL'::entity_role, 'Sponsorship Commerce General', '2bd9ea7f-41ec-5bb1-8bfd-a24c2c4ff416'::uuid, 'A sponsor pays to associate with content, audiences, events, products, or outcomes.'),
    ('9f58f684-55db-5552-ba5a-cd05bcc4fed5'::uuid, 'G-M05-12', 'GENERAL'::entity_role, 'Lead-Generation Commerce General', '2bd9ea7f-41ec-5bb1-8bfd-a24c2c4ff416'::uuid, 'Qualified prospect information or introductions are sold to businesses.'),
    ('4ac72f89-b00e-5822-baa1-f2129c1d7924'::uuid, 'G-M05-13', 'GENERAL'::entity_role, 'Pay-per-Download General', '2bd9ea7f-41ec-5bb1-8bfd-a24c2c4ff416'::uuid, 'A separate charge is collected for each downloaded file or licensed asset.'),
    ('0ee26480-d160-5f76-8dbd-bf6e489f0f5b'::uuid, 'G-M05-14', 'GENERAL'::entity_role, 'Pay-per-Use General', '2bd9ea7f-41ec-5bb1-8bfd-a24c2c4ff416'::uuid, 'The customer pays each time a service, unit, feature, or asset is used.'),
    ('b29a0b28-f2ef-5521-b8b4-45c2b4fc57ce'::uuid, 'G-M05-15', 'GENERAL'::entity_role, 'Recurring Replenishment General', '2bd9ea7f-41ec-5bb1-8bfd-a24c2c4ff416'::uuid, 'Consumable products are automatically reordered and delivered at a recurring interval.'),
    ('23cbfdfd-5821-5549-90f3-0247a2faf3d0'::uuid, 'G-M05-16', 'GENERAL'::entity_role, 'Bundled Commerce General', '2bd9ea7f-41ec-5bb1-8bfd-a24c2c4ff416'::uuid, 'Multiple products, services, or entitlements are packaged and priced as one offer.'),
    ('68cbb10a-1f48-5b95-819a-28a91ca53eed'::uuid, 'G-M06-01', 'GENERAL'::entity_role, 'Service Commerce General', 'e578ba43-f528-5a41-a7f6-6d736bb638a9'::uuid, 'Services are packaged, sold, paid for, and managed through an online transaction flow.'),
    ('7991d440-ff5a-5fad-aebc-8c9422529f52'::uuid, 'G-M06-02', 'GENERAL'::entity_role, 'Booking Commerce General', 'e578ba43-f528-5a41-a7f6-6d736bb638a9'::uuid, 'Customers reserve time, capacity, inventory, or experiences through a booking system.'),
    ('60552746-f641-5fd4-ad77-9ef25b133d73'::uuid, 'G-M06-03', 'GENERAL'::entity_role, 'Appointment Commerce General', 'e578ba43-f528-5a41-a7f6-6d736bb638a9'::uuid, 'Customers schedule time with a specific provider, professional, or location.'),
    ('03d36404-a0f2-5711-b6cd-3bb8e1dfea3f'::uuid, 'G-M06-04', 'GENERAL'::entity_role, 'On-Demand Services General', 'e578ba43-f528-5a41-a7f6-6d736bb638a9'::uuid, 'Services are requested and dispatched with minimal delay based on real-time availability.'),
    ('12aebb5b-bdee-5298-9e86-b0d60efa2c67'::uuid, 'G-M06-05', 'GENERAL'::entity_role, 'Productized Services General', 'e578ba43-f528-5a41-a7f6-6d736bb638a9'::uuid, 'A service is standardized into a defined scope, price, process, and deliverable.'),
    ('d8776ef7-5a42-54c2-bfb8-f3394c4dee9a'::uuid, 'G-M06-06', 'GENERAL'::entity_role, 'Consulting Commerce General', 'e578ba43-f528-5a41-a7f6-6d736bb638a9'::uuid, 'Expert diagnosis, strategy, or implementation guidance is sold through engagements or packages.'),
    ('24bce88b-0c60-5a27-b17f-842a4adfde00'::uuid, 'G-M06-07', 'GENERAL'::entity_role, 'Coaching Commerce General', 'e578ba43-f528-5a41-a7f6-6d736bb638a9'::uuid, 'Goal-oriented guidance, accountability, and development are delivered through sessions or programs.'),
    ('c26fc7de-13db-5d13-99a9-ad690ef9bccb'::uuid, 'G-M06-08', 'GENERAL'::entity_role, 'Tutoring Commerce General', 'e578ba43-f528-5a41-a7f6-6d736bb638a9'::uuid, 'Instruction and learning support are sold by subject, session, package, or outcome.'),
    ('1c119a48-c993-5a8f-9a76-81d63bf36f1f'::uuid, 'G-M06-09', 'GENERAL'::entity_role, 'Telehealth Commerce General', 'e578ba43-f528-5a41-a7f6-6d736bb638a9'::uuid, 'Health-related consultations or services are delivered remotely under applicable clinical and legal controls.'),
    ('8d19bf32-d922-5795-9ceb-f0c0037649cf'::uuid, 'G-M06-10', 'GENERAL'::entity_role, 'Ticketing Commerce General', 'e578ba43-f528-5a41-a7f6-6d736bb638a9'::uuid, 'Access rights to events, venues, transport, or experiences are sold and validated digitally.'),
    ('c29cae8d-6fc4-58ba-9042-adc38b5e424d'::uuid, 'G-M06-11', 'GENERAL'::entity_role, 'Travel Booking General', 'e578ba43-f528-5a41-a7f6-6d736bb638a9'::uuid, 'Travel inventory and related services are searched, reserved, packaged, and paid for online.'),
    ('cf72ab76-9464-515d-9c9a-13cbb874e1bf'::uuid, 'G-M06-12', 'GENERAL'::entity_role, 'Food Delivery General', 'e578ba43-f528-5a41-a7f6-6d736bb638a9'::uuid, 'Prepared food orders are routed from merchants to customers through pickup and delivery operations.'),
    ('c0cf535b-79ee-57fe-841d-77d146361b43'::uuid, 'G-M06-13', 'GENERAL'::entity_role, 'Local-Service Commerce General', 'e578ba43-f528-5a41-a7f6-6d736bb638a9'::uuid, 'Customers discover, purchase, and schedule geographically constrained services.'),
    ('e66f9237-3860-5e2d-8d69-05f5f37ab507'::uuid, 'G-M07-01', 'GENERAL'::entity_role, 'Social Commerce General', '4e396ffd-a01b-5719-860b-6232d96b0d36'::uuid, 'Products are discovered and purchased within or directly through social platforms.'),
    ('cf198f83-86b2-5689-bf49-965f11c7bd28'::uuid, 'G-M07-02', 'GENERAL'::entity_role, 'Mobile Commerce General', '4e396ffd-a01b-5719-860b-6232d96b0d36'::uuid, 'The buying journey is designed primarily for smartphones, mobile web, or mobile apps.'),
    ('2c027c24-e9af-5944-9710-6d30ce435d65'::uuid, 'G-M07-03', 'GENERAL'::entity_role, 'Live Commerce General', '4e396ffd-a01b-5719-860b-6232d96b0d36'::uuid, 'Products are demonstrated and sold during interactive live video broadcasts.'),
    ('7564fe41-e74d-5cce-8fe6-097ca96dfc93'::uuid, 'G-M07-04', 'GENERAL'::entity_role, 'Conversational Commerce General', '4e396ffd-a01b-5719-860b-6232d96b0d36'::uuid, 'Sales and service occur through chat, messaging, or AI-assisted conversations.'),
    ('b6bc0b62-622e-538b-9ecb-c0aea42fb9a1'::uuid, 'G-M07-05', 'GENERAL'::entity_role, 'Influencer Commerce General', '4e396ffd-a01b-5719-860b-6232d96b0d36'::uuid, 'Creators with established audiences drive demand, conversion, or co-branded sales.'),
    ('e90c519d-d455-547a-927a-4c20ea5c30a5'::uuid, 'G-M07-06', 'GENERAL'::entity_role, 'Creator Commerce General', '4e396ffd-a01b-5719-860b-6232d96b0d36'::uuid, 'Creators monetize owned audiences through products, services, memberships, or digital offers.'),
    ('f447d3f2-41a5-5aa3-9135-49930fd25117'::uuid, 'G-M07-07', 'GENERAL'::entity_role, 'Affiliate Storefronts General', '4e396ffd-a01b-5719-860b-6232d96b0d36'::uuid, 'Curated storefronts present third-party products and earn attributable referral revenue.'),
    ('7b7010de-b81c-58e2-b880-4874677952f5'::uuid, 'G-M07-08', 'GENERAL'::entity_role, 'Marketplace Selling General', '4e396ffd-a01b-5719-860b-6232d96b0d36'::uuid, 'A business sells through a third-party marketplace while managing listings, rank, fees, and platform rules.'),
    ('0bc36161-c78a-52ea-b450-275df4e24453'::uuid, 'G-M07-09', 'GENERAL'::entity_role, 'Omnichannel Commerce General', '4e396ffd-a01b-5719-860b-6232d96b0d36'::uuid, 'Channels share customer, inventory, order, and service context in one coordinated experience.'),
    ('60e12560-02fb-548e-9839-70d7ba88ab89'::uuid, 'G-M07-10', 'GENERAL'::entity_role, 'Multichannel Commerce General', '4e396ffd-a01b-5719-860b-6232d96b0d36'::uuid, 'A business sells through multiple channels that may operate with separate processes or data.'),
    ('72ffacc0-d6c9-5bcb-babb-d3b2f53a88e5'::uuid, 'G-M07-11', 'GENERAL'::entity_role, 'Cross-Border Commerce General', '4e396ffd-a01b-5719-860b-6232d96b0d36'::uuid, 'Products or services are sold internationally with localization, tax, customs, currency, and logistics controls.'),
    ('420ad01c-e5a2-5521-9cd1-538d14f87efd'::uuid, 'G-M07-12', 'GENERAL'::entity_role, 'Local Commerce General', '4e396ffd-a01b-5719-860b-6232d96b0d36'::uuid, 'Demand, inventory, fulfillment, and customer experience are optimized for a defined geographic market.'),
    ('5df30aeb-83ca-5f61-88cc-756cf0996f40'::uuid, 'G-M07-13', 'GENERAL'::entity_role, 'Voice Commerce General', '4e396ffd-a01b-5719-860b-6232d96b0d36'::uuid, 'Customers search, select, order, or manage purchases through voice interfaces.'),
    ('670b574f-8dcf-5f1d-a340-06af0986a4e1'::uuid, 'G-M07-14', 'GENERAL'::entity_role, 'Embedded Commerce General', '4e396ffd-a01b-5719-860b-6232d96b0d36'::uuid, 'Purchasing capability is integrated inside another product, workflow, platform, or user experience.'),
    ('c858489a-6ab0-5496-b3b5-9f2afd6c5934'::uuid, 'G-M08-01', 'GENERAL'::entity_role, 'Subscription Boxes General', '22c8d3e1-65e9-5cc1-b574-2bc11c24ef84'::uuid, 'Recurring curated product assortments are managed as a specialized merchandising and retention format.'),
    ('24d5cf6e-4934-5121-95cc-3c2531532096'::uuid, 'G-M08-02', 'GENERAL'::entity_role, 'Mystery Boxes General', '22c8d3e1-65e9-5cc1-b574-2bc11c24ef84'::uuid, 'Customers purchase an unknown or partially disclosed assortment with controlled value and disclosure rules.'),
    ('775f4e0b-4500-542c-8f98-10b2311ebeee'::uuid, 'G-M08-03', 'GENERAL'::entity_role, 'Group Buying General', '22c8d3e1-65e9-5cc1-b574-2bc11c24ef84'::uuid, 'Demand is aggregated so participants receive better pricing or access when thresholds are reached.'),
    ('22a7e894-76f3-5644-b323-4af0a4707461'::uuid, 'G-M08-04', 'GENERAL'::entity_role, 'Flash-Sale Commerce General', '22c8d3e1-65e9-5cc1-b574-2bc11c24ef84'::uuid, 'Inventory is offered for a short, predetermined window to create urgency and concentrated demand.'),
    ('57850dda-80f3-596d-999a-31bc913f2fbc'::uuid, 'G-M08-05', 'GENERAL'::entity_role, 'Daily-Deal Commerce General', '22c8d3e1-65e9-5cc1-b574-2bc11c24ef84'::uuid, 'A rotating offer or limited set of offers is promoted for a defined day or period.'),
    ('4942a280-b673-5e11-9862-805915d673ca'::uuid, 'G-M08-06', 'GENERAL'::entity_role, 'Curated Commerce General', '22c8d3e1-65e9-5cc1-b574-2bc11c24ef84'::uuid, 'Assortments are selected and presented through expert judgment, taste, or audience fit.'),
    ('f2438129-914a-507b-a5e6-f4f3e46898d6'::uuid, 'G-M08-07', 'GENERAL'::entity_role, 'Niche Commerce General', '22c8d3e1-65e9-5cc1-b574-2bc11c24ef84'::uuid, 'A tightly defined audience or need is served with specialized products, language, and positioning.'),
    ('d178685d-243a-5ba4-b095-5a2c91032467'::uuid, 'G-M08-08', 'GENERAL'::entity_role, 'Luxury Commerce General', '22c8d3e1-65e9-5cc1-b574-2bc11c24ef84'::uuid, 'High-value products or services are sold through controlled brand, experience, trust, and exclusivity.'),
    ('d5db1e7c-1585-590f-8af1-312e2cc4074f'::uuid, 'G-M08-09', 'GENERAL'::entity_role, 'Resale Commerce General', '22c8d3e1-65e9-5cc1-b574-2bc11c24ef84'::uuid, 'Previously owned products are marketed and sold as a specialized retail format.'),
    ('22c4dbaa-44a9-5a19-bcda-ad73f5535d26'::uuid, 'G-M08-10', 'GENERAL'::entity_role, 'Circular Commerce General', '22c8d3e1-65e9-5cc1-b574-2bc11c24ef84'::uuid, 'Products and materials remain in use through resale, repair, return, refurbishment, or reuse loops.'),
    ('ba0be5f8-19b0-5f6f-8fbb-4db21a28a0d6'::uuid, 'G-M08-11', 'GENERAL'::entity_role, 'Sustainable Commerce General', '22c8d3e1-65e9-5cc1-b574-2bc11c24ef84'::uuid, 'Commercial decisions prioritize reduced environmental and social harm with supportable claims.'),
    ('4392d52e-25b4-57ea-aa18-85e5e099fe12'::uuid, 'G-M08-12', 'GENERAL'::entity_role, 'Rental Commerce General', '22c8d3e1-65e9-5cc1-b574-2bc11c24ef84'::uuid, 'Temporary access is the core commercial proposition, with asset utilization and recovery as central controls.'),
    ('df66973f-0c03-56ee-a557-684a76ba6321'::uuid, 'G-M08-13', 'GENERAL'::entity_role, 'Fractional Ownership Commerce General', '22c8d3e1-65e9-5cc1-b574-2bc11c24ef84'::uuid, 'Multiple buyers acquire defined ownership interests or usage rights in a shared asset.'),
    ('dbb0b6e4-a48e-56c0-98cf-b354acc18c1f'::uuid, 'G-M08-14', 'GENERAL'::entity_role, 'Donation-Based Commerce General', '22c8d3e1-65e9-5cc1-b574-2bc11c24ef84'::uuid, 'Payments are voluntary contributions rather than conventional consideration for a purchase.'),
    ('6d31da6c-a7b8-5ced-a9a1-9994f96b23f1'::uuid, 'G-M08-15', 'GENERAL'::entity_role, 'Nonprofit Commerce General', '22c8d3e1-65e9-5cc1-b574-2bc11c24ef84'::uuid, 'Commercial activity supports a nonprofit mission and operates under nonprofit governance constraints.'),
    ('53c0e340-a9cf-552c-8294-7ad504dfaa49'::uuid, 'G-M08-16', 'GENERAL'::entity_role, 'Cause-Related Commerce General', '22c8d3e1-65e9-5cc1-b574-2bc11c24ef84'::uuid, 'Purchases are linked to a stated social or environmental cause through defined contributions or campaigns.');

DO $$
DECLARE
    mismatch record;
BEGIN
    SELECT s.stable_code, s.id AS seed_id, e.id AS existing_id
    INTO mismatch
    FROM canonical_seed_stage s
    JOIN entities e ON e.stable_code = s.stable_code
    WHERE e.id <> s.id
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION
            'Canonical seed ID mismatch for stable code %: expected %, found %',
            mismatch.stable_code, mismatch.seed_id, mismatch.existing_id;
    END IF;

    SELECT s.stable_code, s.id AS seed_id, e.stable_code AS existing_code
    INTO mismatch
    FROM canonical_seed_stage s
    JOIN entities e ON e.id = s.id
    WHERE e.stable_code <> s.stable_code
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION
            'Canonical seed stable-code mismatch for ID %: expected %, found %',
            mismatch.seed_id, mismatch.stable_code, mismatch.existing_code;
    END IF;
END $$;

INSERT INTO entities(
    id, stable_code, role, name, parent_id, status, definition,
    taxonomy_version_id, source_version, configuration
)
SELECT
    id, stable_code, role, name, parent_id, 'ACTIVE', definition,
    'd10d945f-fdde-5cb2-aee5-7be737fa52f1'::uuid, '1.0.0',
    jsonb_build_object('seeded', true, 'taxonomy_version', '1.0.0')
FROM canonical_seed_stage
WHERE role = 'ENTRAL'
ON CONFLICT (id) DO UPDATE SET
    stable_code = EXCLUDED.stable_code,
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    status = EXCLUDED.status,
    definition = EXCLUDED.definition,
    taxonomy_version_id = EXCLUDED.taxonomy_version_id,
    source_version = EXCLUDED.source_version,
    configuration = entities.configuration || EXCLUDED.configuration,
    retired_at = NULL
WHERE (
    entities.stable_code,
    entities.role,
    entities.name,
    entities.parent_id,
    entities.status,
    entities.definition,
    entities.taxonomy_version_id,
    entities.source_version,
    entities.configuration,
    entities.retired_at
) IS DISTINCT FROM (
    EXCLUDED.stable_code,
    EXCLUDED.role,
    EXCLUDED.name,
    EXCLUDED.parent_id,
    EXCLUDED.status,
    EXCLUDED.definition,
    EXCLUDED.taxonomy_version_id,
    EXCLUDED.source_version,
    entities.configuration || EXCLUDED.configuration,
    NULL
);

INSERT INTO entities(
    id, stable_code, role, name, parent_id, status, definition,
    taxonomy_version_id, source_version, configuration
)
SELECT
    id, stable_code, role, name, parent_id, 'ACTIVE', definition,
    'd10d945f-fdde-5cb2-aee5-7be737fa52f1'::uuid, '1.0.0',
    jsonb_build_object('seeded', true, 'taxonomy_version', '1.0.0')
FROM canonical_seed_stage
WHERE role = 'MARSHAL'
ORDER BY stable_code
ON CONFLICT (id) DO UPDATE SET
    stable_code = EXCLUDED.stable_code,
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    status = EXCLUDED.status,
    definition = EXCLUDED.definition,
    taxonomy_version_id = EXCLUDED.taxonomy_version_id,
    source_version = EXCLUDED.source_version,
    configuration = entities.configuration || EXCLUDED.configuration,
    retired_at = NULL
WHERE (
    entities.stable_code,
    entities.role,
    entities.name,
    entities.parent_id,
    entities.status,
    entities.definition,
    entities.taxonomy_version_id,
    entities.source_version,
    entities.configuration,
    entities.retired_at
) IS DISTINCT FROM (
    EXCLUDED.stable_code,
    EXCLUDED.role,
    EXCLUDED.name,
    EXCLUDED.parent_id,
    EXCLUDED.status,
    EXCLUDED.definition,
    EXCLUDED.taxonomy_version_id,
    EXCLUDED.source_version,
    entities.configuration || EXCLUDED.configuration,
    NULL
);

INSERT INTO entities(
    id, stable_code, role, name, parent_id, status, definition,
    taxonomy_version_id, source_version, configuration
)
SELECT
    id, stable_code, role, name, parent_id, 'ACTIVE', definition,
    'd10d945f-fdde-5cb2-aee5-7be737fa52f1'::uuid, '1.0.0',
    jsonb_build_object(
        'seeded', true,
        'taxonomy_version', '1.0.0',
        'parent_code', split_part(stable_code, '-', 2)
    )
FROM canonical_seed_stage
WHERE role = 'GENERAL'
ORDER BY stable_code
ON CONFLICT (id) DO UPDATE SET
    stable_code = EXCLUDED.stable_code,
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    status = EXCLUDED.status,
    definition = EXCLUDED.definition,
    taxonomy_version_id = EXCLUDED.taxonomy_version_id,
    source_version = EXCLUDED.source_version,
    configuration = entities.configuration || EXCLUDED.configuration,
    retired_at = NULL
WHERE (
    entities.stable_code,
    entities.role,
    entities.name,
    entities.parent_id,
    entities.status,
    entities.definition,
    entities.taxonomy_version_id,
    entities.source_version,
    entities.configuration,
    entities.retired_at
) IS DISTINCT FROM (
    EXCLUDED.stable_code,
    EXCLUDED.role,
    EXCLUDED.name,
    EXCLUDED.parent_id,
    EXCLUDED.status,
    EXCLUDED.definition,
    EXCLUDED.taxonomy_version_id,
    EXCLUDED.source_version,
    entities.configuration || EXCLUDED.configuration,
    NULL
);

DO $$
DECLARE
    entral_count integer;
    marshal_count integer;
    general_count integer;
BEGIN
    SELECT count(*) FILTER (WHERE role = 'ENTRAL'),
           count(*) FILTER (WHERE role = 'MARSHAL'),
           count(*) FILTER (WHERE role = 'GENERAL')
    INTO entral_count, marshal_count, general_count
    FROM entities
    WHERE taxonomy_version_id = 'd10d945f-fdde-5cb2-aee5-7be737fa52f1'::uuid
      AND status <> 'RETIRED';

    IF entral_count <> 1 OR marshal_count <> 8 OR general_count <> 123 THEN
        RAISE EXCEPTION
            'Canonical seed count failure: ENTRAL %, Marshals %, Generals %',
            entral_count, marshal_count, general_count;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM entities e
        LEFT JOIN entities p ON p.id = e.parent_id
        WHERE e.taxonomy_version_id = 'd10d945f-fdde-5cb2-aee5-7be737fa52f1'::uuid
          AND (
              (e.role = 'ENTRAL' AND e.parent_id IS NOT NULL) OR
              (e.role = 'MARSHAL' AND p.role IS DISTINCT FROM 'ENTRAL') OR
              (e.role = 'GENERAL' AND p.role IS DISTINCT FROM 'MARSHAL')
          )
    ) THEN
        RAISE EXCEPTION 'Canonical seed hierarchy validation failed';
    END IF;
END $$;

INSERT INTO audit_entries(
    actor_kind, action, reason, target_type, target_id, result, after_state
) SELECT
    'SYSTEM',
    'taxonomy.seed',
    'Install canonical ENTRAL taxonomy edition 1.0',
    'TAXONOMY',
    'd10d945f-fdde-5cb2-aee5-7be737fa52f1'::uuid,
    'SUCCEEDED',
    '{"entral":1,"marshals":8,"generals":123,"semantic_version":"1.0.0"}'::jsonb
WHERE NOT EXISTS (
    SELECT 1
    FROM audit_entries
    WHERE action = 'taxonomy.seed'
      AND target_type = 'TAXONOMY'
      AND target_id = 'd10d945f-fdde-5cb2-aee5-7be737fa52f1'::uuid
      AND result = 'SUCCEEDED'
);

SELECT emit_canonical_event(
    'taxonomy.seeded',
    'TAXONOMY',
    'd10d945f-fdde-5cb2-aee5-7be737fa52f1'::uuid,
    1,
    NULL,
    '45638366-d6f0-5b27-91bf-d2362df27922'::uuid,
    NULL,
    '{"entral":1,"marshals":8,"generals":123,"semantic_version":"1.0.0"}'::jsonb
)
WHERE NOT EXISTS (
    SELECT 1
    FROM canonical_events
    WHERE event_type = 'taxonomy.seeded'
      AND aggregate_type = 'TAXONOMY'
      AND aggregate_id = 'd10d945f-fdde-5cb2-aee5-7be737fa52f1'::uuid
      AND payload @> '{"semantic_version":"1.0.0"}'::jsonb
);

COMMIT;
