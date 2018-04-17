/**
 * featureDao module.
 * @module features/user/featureDao
 */

var UserDao = require('../../user/userDao')
  , GeometryColumnsDao = require('../columns').GeometryColumnsDao
  , ContentsDao = require('../../core/contents').ContentsDao
  , FeatureRow = require('./featureRow')
  , FeatureTableIndex = require('../../extension/index/featureTableIndex');

var util = require('util');

/**
 *  Initialize
 *
 *  @param database        database connection
 *  @param table           feature table
 *  @param geometryColumns geometry columns
 *
 *  @return new feature dao
 */
/**
 * Initialize
 * @param  {sqlite3} db              database connection
 * @param  {FeatureTable} table           feature table
 * @param  {GeometryColumns} geometryColumns geometry columns
 * @param  {MetadataDb} metadataDb      metadata db
 */
var FeatureDao = function(db, table, geometryColumns, metadataDb) {
  UserDao.call(this, db, table);
  this.geometryColumns = geometryColumns;
  this.metadataDb = metadataDb;
  this.featureTableIndex = new FeatureTableIndex(this.connection, this);
  var dao = this.getGeometryColumnsDao();
  // TODO figure out how to async Initialize
  // if (!dao.getContents(geometryColumns)) {
  //   throw new Error('Geometry Columns ' + dao.getId(geometryColumns) + ' has null Contents');
  // }
  // if (!dao.getSrs(geometryColumns)) {
  //   throw new Error('Geometry Columns ' + dao.getId(geometryColumns) + ' has null Spatial Reference System');
  // }
  // this.projection = dao.getProjection(geometryColumns);
}

util.inherits(FeatureDao, UserDao);

FeatureDao.prototype.createObject = function (results) {
  if (results) {
    return this.getRow(results);
  }
  return this.newRow();
};

/**
 * Get the feature table
 * @return {FeatureTable} the feature table
 */
FeatureDao.prototype.getFeatureTable = function () {
  return this.table;
};

/**
 * Get the feature row for the current result in the result set
 * @param  {object} results results
 * @return {FeatureRow}         feature row
 */
FeatureDao.prototype.getFeatureRow = function (results) {
  return this.getRow(results);
};

/**
 * Create a new feature row with the column types and values
 * @param  {Array} columnTypes column types
 * @param  {Array} values      values
 * @return {FeatureRow}             feature row
 */
FeatureDao.prototype.newRowWithColumnTypes = function (columnTypes, values) {
  return new FeatureRow(this.getFeatureTable(), columnTypes, values);
};

/**
 * Create a new feature row
 * @return {FeatureRow} feature row
 */
FeatureDao.prototype.newRow = function () {
  return new FeatureRow(this.getFeatureTable());
};

/**
 * Get the geometry column name
 * @return {string} the geometry column name
 */
FeatureDao.prototype.getGeometryColumnName = function () {
  return this.geometryColumns.column_name;
};

/**
 * Get the geometry types
 * @return {WKBGeometryType} well known binary geometry type
 */
FeatureDao.prototype.getGeometryType = function () {
  return this.geometryColumns.getGeometryType();
};

/**
 * Get the Geometry Columns DAO
 * @return {GeometryColumnsDao} geometry columns dao
 */
FeatureDao.prototype.getGeometryColumnsDao = function () {
  return new GeometryColumnsDao(this.connection);
};

/**
 * Get the ContentsDao
 * @return {ContentsDao} contents dao
 */
FeatureDao.prototype.getContentsDao = function () {
  return new ContentsDao(this.connection);
};

FeatureDao.prototype.getSrs = function(callback) {
  this.getGeometryColumnsDao().getSrs(this.geometryColumns, callback);
};

/**
 * Determine if the feature table is indexed
 * @param  {Function} callback called with err if one occurred and true or false indicating the indexed status
 */
FeatureDao.prototype.isIndexed = function(callback) {
  return this.featureTableIndex.isIndexed(callback);
}

FeatureDao.prototype.queryIndexedFeaturesWithWebMercatorBoundingBox = function(boundingBox, featureRowCallback, doneCallback) {
  this.featureTableIndex.queryWithBoundingBox(boundingBox, 3857, function(err, row, rowCallback) {
    featureRowCallback(err, this.getFeatureRow(row), rowCallback);
  }.bind(this), doneCallback);
}

FeatureDao.prototype.getBoundingBox = function () {
  return undefined;
  // TODO
  // GPKGGeometryColumnsDao * geometryColumnsDao = [self getGeometryColumnsDao];
  // GPKGContents * contents = [geometryColumnsDao getContents:self.geometryColumns];
  // GPKGContentsDao * contentsDao = [self getContentsDao];
  // GPKGProjection * contentsProjection = [contentsDao getProjection:contents];
  //
  // GPKGBoundingBox * boundingBox = [contents getBoundingBox];
  // if([self.projection.epsg compare:contentsProjection.epsg] != NSOrderedSame){
  //     GPKGProjectionTransform * transform = [[GPKGProjectionTransform alloc] initWithFromProjection:contentsProjection andToProjection:self.projection];
  //     boundingBox = [transform transformWithBoundingBox:boundingBox];
  // }
  //
  // return boundingBox;
};

module.exports = FeatureDao;
